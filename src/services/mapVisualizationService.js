const User = require('../models/User');
const Port = require('../models/Port');
const Shipment = require('../models/Shipment');
const Delay = require('../models/Delay');
const Incident = require('../models/Incident');
const VesselTracking = require('../models/VesselTracking');

const getMapDataService = async (email) => {
    try {
        console.log('Starting map data processing for email:', email);
        
        // 1. Get user by email
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('User not found');
        }
        console.log('Found user:', user._id);

        // 2. Get all shipments for the user
        const shipments = await Shipment.find({ client_id: user._id });
        console.log('Found shipments:', shipments.length);

        // 3. Get delays for these shipments
        const delays = await Delay.find({ shipment: { $in: shipments.map(s => s._id) } });
        console.log('Found delays:', delays.length);

        // Create a map to store locations and their affected shipments
        const locationMap = new Map();

        // 4. Process delays and their incidents
        for (const delay of delays) {
            if (delay.location_type === 'port') {
                // Handle port delays
                for (const portDelay of delay.affected_ports) {
                    const incident = await Incident.findById(portDelay.incident);
                    if (incident) {
                        const port = await Port.findById(portDelay.port);
                        if (port && port.lat_lon && port.lat_lon.length === 2) {
                            const locationKey = `${port.lat_lon[0]},${port.lat_lon[1]}`;
                            
                            if (!locationMap.has(locationKey)) {
                                locationMap.set(locationKey, {
                                    latitude: port.lat_lon[0].toString(),
                                    longitude: port.lat_lon[1].toString(),
                                    name: portDelay.port_name,
                                    affectedShipments: []
                                });
                            }

                            // Get shipment details
                            const shipment = await Shipment.findById(delay.shipment);
                            const vesselTracking = await VesselTracking.findById(shipment.tracking_id);

                            locationMap.get(locationKey).affectedShipments.push({
                                vessel: vesselTracking?.vessel_name || 'Unknown Vessel',
                                originPort: shipment.origin_port,
                                destinationPort: shipment.destination_port,
                                impact: incident.severity,
                                delay: `${delay.delay_days || 0} Days`
                            });
                        }
                    }
                }
            } else {
                // Handle sea delays
                for (const seaDelay of delay.sea_delays) {
                    const incident = await Incident.findById(seaDelay.incident);
                    if (incident && incident.lat_lon && incident.lat_lon.length === 2) {
                        const locationKey = `${incident.lat_lon[0]},${incident.lat_lon[1]}`;
                        
                        if (!locationMap.has(locationKey)) {
                            locationMap.set(locationKey, {
                                latitude: incident.lat_lon[0].toString(),
                                longitude: incident.lat_lon[1].toString(),
                                name: 'Sea Incident',
                                affectedShipments: []
                            });
                        }

                        // Get shipment details
                        const shipment = await Shipment.findById(delay.shipment);
                        const vesselTracking = await VesselTracking.findById(shipment.tracking_id);

                        locationMap.get(locationKey).affectedShipments.push({
                            vessel: vesselTracking?.vessel_name || 'Unknown Vessel',
                            originPort: shipment.origin_port,
                            destinationPort: shipment.destination_port,
                            impact: incident.severity,
                            delay: `${delay.delay_days || 0} Days`
                        });
                    }
                }
            }
        }

        // Convert map to array
        const result = Array.from(locationMap.values());

        // Log the result
        console.log('\nFinal Map Data:');
        console.log(JSON.stringify(result, null, 2));

        return result;
    } catch (error) {
        console.error('Error in getMapDataService:', error);
        throw error;
    }
};

module.exports = {
    getMapDataService
}; 