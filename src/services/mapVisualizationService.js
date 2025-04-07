const User = require('../models/User');
const Port = require('../models/Port');
const Shipment = require('../models/Shipment');
const Delay = require('../models/Delay');
const Incident = require('../models/Incident');
const VesselTracking = require('../models/VesselTracking');

const getMapDataService = async (email) => {
    try {
        // 1. Get user by email
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('User not found');
        }

        // 2. Get all shipments for the user
        const shipments = await Shipment.find({ client_id: user._id });
        // 3. Get delays for these shipments
        const delays = await Delay.find({ shipment: { $in: shipments.map(s => s._id) } });
        // Create map data structure
        const mapData = {
            danger: {
                coordinates: [],
                names: [],
                radius: []
            },
            caution: {
                coordinates: [],
                names: [],
                radius: []
            },
            normal: {
                coordinates: [],
                names: [],
                radius: []
            }
        };

        // 4. Process delays and their incidents
        for (const delay of delays) {
            if (delay.location_type === 'port') {
                // Handle port delays
                for (const portDelay of delay.affected_ports) {
                    const incident = await Incident.findById(portDelay.incident);
                    if (incident) {
                        let coordinates = await Port.findById(portDelay.port);
                        coordinates = coordinates.lat_lon;
                        if (coordinates && coordinates.length === 2) {
                            if (incident.severity >= 7) {
                                mapData.danger.coordinates.push(coordinates);
                                mapData.danger.names.push(portDelay.port_name);
                                mapData.danger.radius.push(15);
                            } else {
                                mapData.caution.coordinates.push(coordinates);
                                mapData.caution.names.push(portDelay.port_name);
                                mapData.caution.radius.push(15);
                            }
                        }
                    }
                }
            } else {
                // Handle sea delays
                for (const seaDelay of delay.sea_delays) {
                    const incident = await Incident.findById(seaDelay.incident);

                    if (incident) {
                        const coordinates = incident.lat_lon;
                        if (coordinates && coordinates.length === 2) {
                            if (incident.severity >= 7) {
                                mapData.danger.coordinates.push(coordinates);
                                mapData.danger.names.push('Sea Incident');
                                mapData.danger.radius.push(15);
                            } else {
                                mapData.caution.coordinates.push(coordinates);
                                mapData.caution.names.push('Sea Incident');
                                mapData.caution.radius.push(15);
                            }
                        }
                    }
                }
            }
        }

        // 5. Get vessel tracking data for shipments without delays
        const delayedShipmentIds = delays.map(d => d.shipment.toString());
        const shipmentsWithoutDelays = shipments.filter(s => 
            !delayedShipmentIds.includes(s._id.toString())
        );
        for (const shipment of shipmentsWithoutDelays) {
            const vesselTracking = await VesselTracking.findById(shipment.tracking_id);
            if (vesselTracking && vesselTracking.lat_lon && vesselTracking.lat_lon.length === 2) {
                mapData.normal.coordinates.push(vesselTracking.lat_lon);
                mapData.normal.names.push(vesselTracking.vessel_name);
                mapData.normal.radius.push(5);
            }
        }
        return mapData;
    } catch (error) {
        console.error('Error in getMapDataService:', error);
        throw error;
    }
};

module.exports = {
    getMapDataService
}; 