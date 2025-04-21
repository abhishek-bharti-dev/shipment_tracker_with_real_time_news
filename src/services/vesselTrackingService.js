const VesselTracking = require('../models/VesselTracking');
const Delay = require('../models/Delay');
const Incident = require('../models/Incident');
const User = require('../models/User');
const Shipment = require('../models/Shipment');
const Port = require('../models/Port');
const News = require('../models/News');
const GocometShipload = require('../models/GocometShipload')

class VesselTrackingService {
    async getAllVesselsWithImpactAndDelay(user_id) {
        try {
            console.log("hello buddy how are you.... ");
            const shipments = await User.find({ _id: user_id });
            const user = shipments[0];
            const shiploadsIds = user.shiploads_ids;
            // console.log(shiploadsIds);
            // console.log("total shiploads of user",shiploadsIds.length);

            // Get all shipments that are in transit (status 2) using aggregation
            const inTransitShipments = await GocometShipload.aggregate([
                {
                    $match: {
                        status: 2
                    }
                },
                {
                    $addFields: {
                        idString: { $toString: "$id" }
                    }
                },
                {
                    $match: {
                        idString: { $in: shiploadsIds }
                    }
                }
            ]);
            console.log("testing");
            for(const shiploads of inTransitShipments){
                console.log(shiploads.id);
            }
            return;

            // console.log("in transit shipments:- ",inTransitShipments.length);
            
            // Get all the shipments associated with this user
            // const shipments = await Shipment.find({ client_id: user_id });
            // console.log("shipments: ", shipments.length);

            // Get all incidents for later use
            const incidents = await Incident.find({});
            
            const result = [];

            // Process each shipment sequentially
            for (const shipment of shipments) {
                // Get vessel details using tracking_id and check if status is "intransit"
                const vessel = await VesselTracking.findOne({ 
                    _id: shipment.tracking_id,
                    status: "intransit"
                });
                if (!vessel) continue;

                // Get delay information for this shipment
                const delay = await Delay.findOne({ shipment: shipment._id });
                // console.log("delay: ", delay);
                
                let totalDelayDays = 0;
                let impactScore = 0;
                let affectedAt = 'No Delay';
                let shipmentIncidentType = 'No Incident';
                let curCoordinates = { latitude: '0', longitude: '0' };
                let nextPort = null;
                let eta = null;

                // Get next port information from vessel events
                if (vessel.events && vessel.events.length > 0) {
                    const nextEvent = vessel.events.find(event => !event.actual_time_of_arrival);
                    if (nextEvent) {
                        nextPort = nextEvent.port_name;
                        eta = nextEvent.expected_time_of_arrival;
                    }
                }

                if (delay) {
                    if (delay.location_type === 'port') {
                        // Sum up port delays
                        totalDelayDays = delay.affected_ports.reduce((sum, port) => sum + port.delay_days, 0);
                        
                        // Get port details for affected ports
                        const portIds = delay.affected_ports.map(port => port.port_code);
                        console.log("portIds: ", portIds);

                        const ports = await Port.find({ port_code: { $in: portIds } });
                        console.log("ports: ", ports);
                        
                        if (ports.length > 0) {
                            affectedAt = ports.map(port => port.port_code).join(', ');
                            // Use the first port's coordinates
                            curCoordinates = {
                                latitude: vessel.lat_lon[0],
                                longitude: vessel.lat_lon[1]
                            };
                        }

                        // Get incident IDs from affected ports
                        const incidentIds = delay.affected_ports.flatMap(port => port.incidents);
                        
                        // Fetch incidents and their related news
                        const relevantIncidents = await Incident.find({
                            _id: { $in: incidentIds }
                        }).populate('source_news');

                        if (relevantIncidents.length > 0) {
                            impactScore = relevantIncidents.reduce((sum, incident) => sum + incident.severity, 0) / relevantIncidents.length;
                            shipmentIncidentType = relevantIncidents.map(incident => 
                                incident.source_news ? incident.source_news.summary : 'No Summary'
                            ).join(', ');
                        }
                    } else if (delay.location_type === 'sea') {
                        // Sum up sea delays
                        totalDelayDays = delay.sea_delays.reduce((sum, delay) => sum + delay.delay_days, 0);
                        
                        // Get incident details for sea delays
                        const incidentIds = delay.sea_delays.flatMap(delay => delay.incidents);
                        const relevantIncidents = await Incident.find({
                            _id: { $in: incidentIds }
                        }).populate('source_news');

                        if (relevantIncidents.length > 0) {
                            impactScore = relevantIncidents.reduce((sum, incident) => sum + incident.severity, 0) / relevantIncidents.length;
                            affectedAt = relevantIncidents.map(incident => 
                                incident.source_news ? incident.source_news.news_location : 'Unknown Location'
                            ).join(', ');
                            shipmentIncidentType = relevantIncidents.map(incident => 
                                incident.source_news ? incident.source_news.summary : 'No Summary'
                            ).join(', ');
                            // Use the first incident's location coordinates
                            if (relevantIncidents[0].source_news) {
                                curCoordinates = {
                                    latitude: vessel.lat_lon[0],
                                    longitude: vessel.lat_lon[1]
                                };
                            }
                        }
                    }
                }

                result.push({
                    vessel: vessel.vessel_name,
                    vesselCode: vessel.vessel_code,
                    originPort: shipment.POL,
                    destinationPort: shipment.POD,
                    impact: Number(impactScore.toFixed(2)),
                    delay: `${totalDelayDays} ${totalDelayDays === 1 ? 'Day' : 'Days'}`,
                    affectedAt,
                    shipmentIncidentType,
                    curCoordinates
                });
            }

            return result;
        } catch (error) {
            console.error('Error in getAllVesselsWithImpactAndDelay:', error);
            throw error;
        }
    }
}

module.exports = new VesselTrackingService(); 