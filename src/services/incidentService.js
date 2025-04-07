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

            // Update affected shipments
            for (const affectedShipment of incidentData.affected_shipments) {
                const shipment = await Shipment.findOne({ bill_of_lading: affectedShipment.bill_of_lading });
                if (shipment) {
                    // Update vessel tracking
                    await VesselTracking.findByIdAndUpdate(shipment.tracking_id, {
                        lat_lon: [affectedShipment.current_coordinates.latitude, affectedShipment.current_coordinates.longitude],
                        expected_arrival: affectedShipment.expected_time_to_reach
                    });
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
            const shipmentIds = userShipments.map(s => s._id);

            // 3. Get delays for these shipments
            const delays = await Delay.find({ shipment: { $in: shipmentIds } });

            // 4. Get all unique incident IDs and port IDs
            const incidentIds = new Set();
            const portIds = new Set();
            
            delays.forEach(delay => {
                if (delay.location_type === 'port') {
                    delay.affected_ports.forEach(port => {
                        incidentIds.add(port.incident.toString());
                        portIds.add(port.port.toString());
                    });
                } else {
                    delay.sea_delays.forEach(sea => {
                        incidentIds.add(sea.incident.toString());
                    });
                }
            });

            // 5. Batch fetch all required data
            const [incidents, ports] = await Promise.all([
                Incident.find({ _id: { $in: Array.from(incidentIds) } }),
                Port.find({ _id: { $in: Array.from(portIds) } })
            ]);

            // 6. Get news data for all incidents
            const newsIds = incidents.map(incident => incident.source_news.toString());
            const news = await News.find({ _id: { $in: newsIds } });

            // 7. Create lookup maps for faster access
            const incidentMap = new Map(incidents.map(i => [i._id.toString(), i]));
            const newsMap = new Map(news.map(n => [n._id.toString(), n]));
            const portMap = new Map(ports.map(p => [p._id.toString(), p]));

            // 8. Process delays and build result
            let resultMap = new Map();
            
            // Process all delays in parallel
            await Promise.all(delays.map(async delay => {
                if (delay.location_type === 'port') {
                    for (const port of delay.affected_ports) {
                        const incidentId = port.incident.toString();
                        const incident = incidentMap.get(incidentId);
                        const newsItem = newsMap.get(incident.source_news.toString());
                        const portDetails = portMap.get(port.port.toString());

                        if (!resultMap.has(incidentId)) {
                            resultMap.set(incidentId, {
                                id: incidentId,
                                type: 'Port Incident',
                                news: [],
                                affected_area: [],
                                affected_shipments: [],
                                severity: incident.severity >= 8 ? 'High' : incident.severity >= 5 ? 'Medium' : 'Low',
                                status: incident.status
                            });
                        }

                        const result = resultMap.get(incidentId);
                        
                        if (portDetails) {
                            result.affected_area.push({
                                name: portDetails.port_name,
                                coordinates: {
                                    latitude: portDetails.lat_lon[0],
                                    longitude: portDetails.lat_lon[1]
                                }
                            });
                        }

                        if (result.news.length === 0) {
                            let imageUrl = newsItem.url;
                            try {
                                const imageResult = await imageExtractionService.extractImageFromArticle(newsItem.url);
                                if (imageResult.imageUrl) {
                                    imageUrl = imageResult.imageUrl;
                                }
                            } catch (error) {
                                console.error('Error extracting image:', error);
                            }

                            const summary = await geminiApi.generateSummary(newsItem.news_details);
                            result.news.push({
                                title: newsItem.title,
                                url: newsItem.url,
                                image: imageUrl,
                                summary: newsItem.news_details
                            });

                            const shipment_details = await this.getVesselDetailsFromShipmentId(
                                delay.shipment,
                                incident.severity,
                                summary
                            );
                            result.affected_shipments.push(shipment_details);
                        }
                    }
                } else {
                    for (const sea of delay.sea_delays) {
                        const incidentId = sea.incident.toString();
                        const incident = incidentMap.get(incidentId);

                        if (!resultMap.has(incidentId)) {
                            resultMap.set(incidentId, {
                                id: incidentId,
                                type: 'Sea Incident',
                                news: [],
                                affected_area: [],
                                affected_shipments: [],
                                severity: incident.severity >= 8 ? 'High' : incident.severity >= 5 ? 'Medium' : 'Low',
                                status: incident.status
                            });
                        }

                        resultMap.get(incidentId).affected_area.push({
                            name: "Sea Incident",
                            coordinates: {
                                latitude: sea.lat_lon[0],
                                longitude: sea.lat_lon[1]
                            }
                        });
                    }
                }
            }));

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