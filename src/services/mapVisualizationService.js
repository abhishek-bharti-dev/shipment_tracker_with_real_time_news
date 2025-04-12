const User = require('../models/User');
const Port = require('../models/Port');
const Shipment = require('../models/Shipment');
const Delay = require('../models/Delay');
const Incident = require('../models/Incident');
const VesselTracking = require('../models/VesselTracking');
const axios = require('axios');

const getLocationName = async (lat, lon) => {
    try {
        const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        return response.data.name || 'Location not found';
    } catch (error) {
        console.error('Error fetching location name:', error);
        return 'Location not found';
    }
};
const calculateTotalDelay = async (shipmentId) => {
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
const getMapDataService = async (email) => {
    try {
        console.log('Starting map data processing for email:', email);
        
        // 1. Get user by email
        const user = await User.findOne({ email });
        if (!user) throw new Error('User not found');
        console.log('Found user:', user._id);

        // 2. Get all shipments for the user with populated tracking data
        const shipments = await Shipment.find({ client_id: user._id })
            .populate({
                path: 'tracking_id',
                match: { status: "intransit" },
                select: 'status vessel_name lat_lon',
            })
            .lean();
        // console.log(shipments);
        console.log('Found shipments:', shipments.length);

        // 3. Get delays for these shipments
        const shipmentIds = shipments.map(s => s._id);
        const delays = await Delay.find({ shipment: { $in: shipmentIds } }).lean();
        console.log('Found delays:', delays.length);

        // 4. Collect all incident and port IDs for bulk fetching
        const incidentIds = new Set();
        const portIds = new Set();
        for (const delay of delays) {
            if (delay.affected_ports) {
                for (const portDelay of delay.affected_ports) {
                    if (portDelay?.incident) incidentIds.add(portDelay.incident.toString());
                    if (portDelay?.port) portIds.add(portDelay.port.toString());
                }
            }
            if (delay.sea_delays) {
                for (const seaDelay of delay.sea_delays) {
                    if (seaDelay?.incident) incidentIds.add(seaDelay.incident.toString());
                }
            }
        }

        // 5. Fetch all incidents and ports in bulk
        const incidents = await Incident.find({ _id: { $in: Array.from(incidentIds) } })
            .populate('source_news')
            .lean();
        const ports = await Port.find({ _id: { $in: Array.from(portIds) } }).lean();

        // Create maps for quick lookups
        const incidentMap = new Map(incidents.map(i => [i._id.toString(), i]));
        const portMap = new Map(ports.map(p => [p._id.toString(), { lat_lon: p.lat_lon, name: p.port_name }]));

        // Create a map to store locations and their affected shipments
        const locationMap = new Map();

        // 6. Process delays and their incidents
        for (const delay of delays) {
            if (delay.location_type === 'port') {
                for (const portDelay of delay.affected_ports || []) {
                    const incident = incidentMap.get(portDelay.incident?.toString());
                    const portInfo = portMap.get(portDelay.port?.toString());
                    
                    if (incident && portInfo?.lat_lon?.length === 2) {
                        const locationKey = `${portInfo.lat_lon[0]},${portInfo.lat_lon[1]}`;
                        
                        if (!locationMap.has(locationKey)) {
                            locationMap.set(locationKey, {
                                latitude: portInfo.lat_lon[0].toString(),
                                longitude: portInfo.lat_lon[1].toString(),
                                name: portInfo.name || 'Unknown Port',
                                affectedShipments: []
                            });
                        }

                        // Get shipment details
                        const shipment = shipments.find(s => s._id.toString() === delay.shipment.toString());
                        const vesselTracking = shipment?.tracking_id;
                        const total_delay = await calculateTotalDelay(shipment._id);
                        console.log(shipment);
                        // console.log(vesselTracking);

                        if (vesselTracking?.vessel_name && vesselTracking.vessel_name !== 'Unknown Vessel') {
                            locationMap.get(locationKey).affectedShipments.push({
                                vessel: vesselTracking.vessel_name,
                                originPort: shipment?.POL || 'Unknown',
                                destinationPort: shipment?.POD || 'Unknown',
                                impact: incident.severity,
                                delay: `${total_delay || 0} Days`
                            });
                        }
                    }
                }
            } else {
                for (const seaDelay of delay.sea_delays || []) {
                    const incident = incidentMap.get(seaDelay.incident?.toString());
                    
                    if (incident?.lat_lon?.length === 2) {
                        const locationKey = `${incident.lat_lon[0]},${incident.lat_lon[1]}`;
                        
                        if (!locationMap.has(locationKey)) {
                            locationMap.set(locationKey, {
                                latitude: incident.lat_lon[0].toString(),
                                longitude: incident.lat_lon[1].toString(),
                                name: incident.source_news?.news_location || 'Sea Incident',
                                affectedShipments: []
                            });
                        }

                        // Get shipment details
                        const shipment = shipments.find(s => s._id.toString() === delay.shipment.toString());
                        const vesselTracking = shipment?.tracking_id;
                        const total_delay = await calculateTotalDelay(shipment._id);

                        if (vesselTracking?.vessel_name && vesselTracking.vessel_name !== 'Unknown Vessel') {
                            locationMap.get(locationKey).affectedShipments.push({
                                vessel: vesselTracking.vessel_name,
                                originPort: shipment?.POL || 'Unknown',
                                destinationPort: shipment?.POD || 'Unknown',
                                impact: incident.severity,
                                delay: `${total_delay || 0} Days`
                            });
                        }
                    }
                }
            }
        }

        // Convert map to array
        const result = Array.from(locationMap.values());

        // Log the result
        // console.log('\nFinal Map Data:');
        // console.log(JSON.stringify(result, null, 2));

        return result;
    } catch (error) {
        console.error('Error in getMapDataService:', error);
        throw error;
    }
};

module.exports = {
    getMapDataService
};
