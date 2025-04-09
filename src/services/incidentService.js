const Incident = require('../models/Incident');
const News = require('../models/News');
const VesselTracking = require('../models/VesselTracking');
const Shipment = require('../models/Shipment');
const User = require('../models/User');
const Delay = require('../models/Delay');
const Port = require('../models/Port');
const { search } = require('../routes/incidentRoutes');
const imageExtractionService = require('./imageExtractionService');
const geminiApi = require('./geminiApi');
const delayService = require('./delayService');
const emailService = require('./emailService');
// const Vessel = require('../models/VesselTracking');

class IncidentService {
    async createIncident(incidentData) {
        try {
            // Create news entry first
            const news = await News.create({
                news_hash: incidentData.news.title.toLowerCase().replace(/\s+/g, '-'),
                title: incidentData.news.title,
                url: incidentData.news.image,
                news_details: incidentData.news.summary,
                published_date: new Date(),
                news_location: incidentData.affected_area[0].name
            });

            // Create incident
            const incident = await Incident.create({
                source_news: news._id,
                location_type: incidentData.type.toLowerCase() === 'port incident' ? 'port' : 'sea',
                lat_lon: [incidentData.affected_area[0].coordinates.latitude, incidentData.affected_area[0].coordinates.longitude],
                start_time: new Date(),
                estimated_duration_days: 7, // Default value, can be adjusted based on severity
                severity: this.calculateSeverity(incidentData.severity),
                status: incidentData.status.toLowerCase()
            });

            // Update affected shipments and send notifications
            for (const affectedShipment of incidentData.affected_shipments) {
                const shipment = await Shipment.findOne({ bill_of_lading: affectedShipment.bill_of_lading });
                if (shipment) {
                    // Update vessel tracking
                    await VesselTracking.findByIdAndUpdate(shipment.tracking_id, {
                        lat_lon: [affectedShipment.current_coordinates.latitude, affectedShipment.current_coordinates.longitude],
                        expected_arrival: affectedShipment.expected_time_to_reach
                    });

                    // Get user details for notification
                    const user = await User.findById(shipment.client_id);
                    if (user && user.email) {
                        // Get vessel details for the notification
                        const vesselDetails = await this.getVesselDetailsFromShipmentId(
                            shipment._id,
                            incident.severity,
                            incidentData.news.summary
                        );

                        // Send detailed notification
                        await emailService.sendDetailedIncidentNotification({
                            to: user.email,
                            incident: {
                                type: incidentData.type,
                                affected_area: incidentData.affected_area,
                                severity: incident.severity,
                                status: incident.status,
                                news: [{
                                    summary: incidentData.news.summary
                                }]
                            },
                            shipment: {
                                shipment_id: shipment.shipment_id,
                                POL: shipment.POL,
                                POD: shipment.POD
                            },
                            vessel: vesselDetails
                        });
                    }
                }
            }

            return incident;
        } catch (error) {
            console.error('Error in createIncident:', error);
            throw error;
        }
    }

    calculateSeverity(severity) {
        const severityMap = {
            'High': 8,
            'Medium': 5,
            'Low': 2
        };
        return severityMap[severity] || 5;
    }

    async calculateTotalDelay(shipmentId) {
        try {
            const delays = await Delay.find({ shipment: shipmentId });
            let totalDelay = 0;

            for (const delay of delays) {
                if (delay.location_type === 'port') {
                    // Sum up delay days from all affected ports
                    totalDelay += delay.affected_ports.reduce((sum, port) => sum + port.delay_days, 0);
                } else {
                    // Sum up delay days from all sea delays
                    totalDelay += delay.sea_delays.reduce((sum, sea) => sum + sea.delay_days, 0);
                }
            }

            return totalDelay;
        } catch (error) {
            console.error('Error in calculateTotalDelay:', error);
            throw error;
        }
    }

    async getVesselDetailsFromShipmentId(shipmentId,severity,news_summary) {
        const shipment = await Shipment.findById(shipmentId);
        const vessel = await VesselTracking.findById(shipment.tracking_id);
        const totalDelay = await delayService.calculateTotalDelay(shipmentId);
        
        // Get expected arrival time from the last event in the events array
        const lastEvent = vessel.events[vessel.events.length - 1];
        const expectedArrivalDate = new Date(lastEvent.expected_time_of_arrival);
        expectedArrivalDate.setDate(expectedArrivalDate.getDate() + totalDelay);

        return {
            vessel_name: vessel.vessel_name,
            bill_of_lading: shipment.shipment_id,
            origin_port: shipment.POL,
            destination_port: shipment.POD,
            impact_score: severity,
            total_delay: totalDelay+" days",
            current_coordinates: {
                latitude: vessel.lat_lon[0],
                longitude: vessel.lat_lon[1]
            },
            expected_time_to_reach: expectedArrivalDate,
            incident: news_summary
        }
    }

    async getIncidents(email) {
        try {
            // 1. Get user by email
            const user = await User.findOne({ email });
            if (!user) {
                throw new Error('User not found');
            }

            // 2. Get all shipments for the user
            const userShipments = await Shipment.find({ client_id: user._id });
            
            // Get all vessel tracking IDs from shipments
            const vesselTrackingIds = userShipments.map(s => s.tracking_id);
            
            // Get all vessels with 'intransit' status
            const activeVessels = await VesselTracking.find({
                _id: { $in: vesselTrackingIds },
                status: 'intransit'
            });
            
            // Filter shipments to only include those with active vessels
            const activeShipmentIds = userShipments
                .filter(shipment => activeVessels.some(vessel => vessel._id.toString() === shipment.tracking_id.toString()))
                .map(s => s._id);
            
            // console.log("activeShipmentIds", activeShipmentIds);
            
            // 3. Get delays for these shipments
            const delays = await Delay.find({ shipment: { $in: activeShipmentIds } });
            // console.log("delays",delays);
            // console.log("delays",delays.length);

            // 4. Get all unique incident IDs and port IDs
            const incidentIds = new Set();
            const portIds = new Set();
            
            delays.forEach(delay => {
                if (delay.location_type === 'port') {
                    console.log("shipment id",delay.shipment);
                    console.log("delay id",delay._id);
                    console.log("delay.affected_ports",delay.affected_ports);
                    delay.affected_ports.forEach(port => {
                        incidentIds.add(port.incident.toString());
                        portIds.add(port.port.toString());
                    });
                } else {
                    console.log("shipment id",delay.shipment);
                    console.log("delay id",delay._id);
                    console.log("delay.sea_delays",delay.sea_delays);
                    delay.sea_delays.forEach(sea => {
                        incidentIds.add(sea.incident.toString());
                    });
                }
            });
            // console.log("main incidentIds",incidentIds);

            // 5. Get all incidents and their related news
            const incidents = await Incident.find({ _id: { $in: Array.from(incidentIds) } })
                .populate('source_news');
            
            console.log("total incidents length",incidents.length);

            // 6. Get all ports
            const ports = await Port.find({ _id: { $in: Array.from(portIds) } });
            console.log("total ports length",ports.length);
            // 7. Create a map to store formatted incidents
            const resultMap = new Map();

            // 8. Format each incident
            for (const incident of incidents) {
                const formattedIncident = {
                    id: incident._id.toString(),
                    type: incident.location_type === 'port' ? 'Port Incident' : 'Sea Incident',
                    news: [{
                        title: incident.source_news.title,
                        url: incident.source_news.url,
                        image: incident.source_news.image,
                        summary: incident.source_news.news_details
                    }],
                    affected_area: [],
                    affected_shipments: [],
                    severity: this.getSeverityText(incident.severity),
                    status: incident.status
                };

                // Add affected areas
                if (incident.location_type === 'port') {
                    // Find ports affected by this incident through the delays
                    const affectedDelays = delays.filter(delay => 
                        delay.location_type === 'port' &&
                        delay.affected_ports.some(port => port.incident.toString() === incident._id.toString())
                    );
                    
                    const affectedPortIds = affectedDelays.flatMap(delay => 
                        delay.affected_ports
                            .filter(port => port.incident.toString() === incident._id.toString())
                            .map(port => port.port)
                    );
                    
                    const affectedPorts = ports.filter(port => 
                        affectedPortIds.some(portId => portId.toString() === port._id.toString())
                    );
                    
                    formattedIncident.affected_area = affectedPorts.map(port => ({
                        name: port.port_name,
                        coordinates: {
                            latitude: port.lat_lon[0],
                            longitude: port.lat_lon[1]
                        }
                    }));
                } else {
                    formattedIncident.affected_area = [{
                        name: incident.source_news.news_location,
                        coordinates: {
                            latitude: incident.lat_lon[0],
                            longitude: incident.lat_lon[1]
                        }
                    }];
                }

                // Add affected shipments
                const affectedDelays = delays.filter(delay => 
                    delay.location_type === incident.location_type &&
                    (delay.location_type === 'port' 
                        ? delay.affected_ports.some(port => port.incident.toString() === incident._id.toString())
                        : delay.sea_delays.some(sea => sea.incident.toString() === incident._id.toString())
                    )
                );

                console.log(`\nProcessing incident: ${incident._id}`);
                console.log(`Number of affected delays: ${affectedDelays.length}`);

                // Process each affected delay
                for (const delay of affectedDelays) {
                    const shipment = await Shipment.findById(delay.shipment);
                    if (!shipment) continue;

                    const vessel = await VesselTracking.findById(shipment.tracking_id);
                    if (!vessel) continue;

                    console.log(`Shipment ID: ${shipment._id}, Incident ID: ${incident._id}`);
                    if (delay.location_type === 'port') {
                        console.log('Port delays:', delay.affected_ports.map(p => ({
                            port: p.port,
                            incident: p.incident,
                            delay_days: p.delay_days
                        })));
                    } else {
                        console.log('Sea delays:', delay.sea_delays.map(s => ({
                            incident: s.incident,
                            delay_days: s.delay_days
                        })));
                    }

                    formattedIncident.affected_shipments.push({
                        vessel_name: vessel.vessel_name,
                        bill_of_lading: shipment.shipment_id,
                        origin_port: shipment.POL,
                        destination_port: shipment.POD,
                        impact_score: incident.severity,
                        total_delay: `${await this.calculateTotalDelay(shipment._id)} days`,
                        current_coordinates: {
                            latitude: vessel.lat_lon[0],
                            longitude: vessel.lat_lon[1]
                        },
                        expected_time_to_reach: vessel.expected_arrival,
                        incident: incident.source_news.summary
                    });
                }

                resultMap.set(incident._id.toString(), formattedIncident);
            }

            return { "incidents": Array.from(resultMap.values()) };
        } catch (error) {
            console.error('Error in getIncidents:', error);
            throw error;
        }
    }

    getSeverityText(severity) {
        if (severity >= 8) return 'High';
        if (severity >= 5) return 'Medium';
        return 'Low';
    }

    async getIncidentById(id) {
        try {
            const incident = await Incident.findById(id)
                .populate('source_news');
            return incident;
        } catch (error) {
            console.error('Error in getIncidentById:', error);
            throw error;
        }
    }

    async updateIncidentStatus(id, status) {
        try {
            const incident = await Incident.findByIdAndUpdate(
                id,
                { status: status.toLowerCase() },
                { new: true }
            );
            return incident;
        } catch (error) {
            console.error('Error in updateIncidentStatus:', error);
            throw error;
        }
    }
}

module.exports = new IncidentService(); 