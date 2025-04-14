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
};

const getMapDataService = async (user_id) => {
    try {
        console.log('Starting map data processing for id:', user_id);
        
        // Get all shipments for the user with populated tracking data
        const shipments = await Shipment.find({ client_id: user_id })
            .populate({
                path: 'tracking_id',
                match: { status: "intransit" },
                select: 'status vessel_name vessel_code lat_lon source destination events',
            })
            .lean();
        
        console.log('Found shipments:', shipments.length);

        // Get delays for these shipments
        const shipmentIds = shipments.map(s => s._id);
        const delays = await Delay.find({ shipment: { $in: shipmentIds } }).lean();
        console.log('Found delays:', delays.length);

        // Collect all incident IDs for bulk fetching
        const incidentIds = new Set();
        const portIds = new Set();
        
        for (const delay of delays) {
            if (delay.location_type === 'port') {
                for (const portDelay of delay.affected_ports || []) {
                    if (portDelay?.incidents) {
                        portDelay.incidents.forEach(id => incidentIds.add(id.toString()));
                    }
                    if (portDelay?.port_code) {
                        portIds.add(portDelay.port_code);
                    }
                }
            } else {
                for (const seaDelay of delay.sea_delays || []) {
                    if (seaDelay?.incidents) {
                        seaDelay.incidents.forEach(id => incidentIds.add(id.toString()));
                    }
                }
            }
        }

        // Fetch all incidents and ports in bulk
        const incidents = await Incident.find({ _id: { $in: Array.from(incidentIds) } })
            .populate('source_news')
            .lean();
        const ports = await Port.find({ port_code: { $in: Array.from(portIds) } }).lean();

        // Create maps for quick lookups
        const incidentMap = new Map(incidents.map(i => [i._id.toString(), i]));
        const portMap = new Map(ports.map(p => [p.port_code, { lat_lon: p.lat_lon, name: p.port_name }]));

        // Create a map to store locations and their affected shipments
        const locationMap = new Map();

        // Process delays and their incidents
        for (const delay of delays) {
            if (delay.location_type === 'port') {
                for (const portDelay of delay.affected_ports || []) {
                    const portInfo = portMap.get(portDelay.port_code);
                    
                    if (portInfo?.lat_lon?.length === 2) {
                        const locationKey = `${portInfo.lat_lon[0]},${portInfo.lat_lon[1]}`;
                        
                        if (!locationMap.has(locationKey)) {
                            locationMap.set(locationKey, {
                                latitude: portInfo.lat_lon[0].toString(),
                                longitude: portInfo.lat_lon[1].toString(),
                                name: portInfo.name || 'Unknown Port',
                                affectedShipments: [],
                                uniqueVesselCodes: new Set()
                            });
                        }

                        // Get shipment details
                        const shipment = shipments.find(s => s._id.toString() === delay.shipment.toString());
                        const vesselTracking = shipment?.tracking_id;
                        const total_delay = await calculateTotalDelay(shipment._id);

                        if (vesselTracking?.vessel_name && vesselTracking.vessel_name !== 'Unknown Vessel' && 
                            !locationMap.get(locationKey).uniqueVesselCodes.has(vesselTracking.vessel_code)) {
                            locationMap.get(locationKey).uniqueVesselCodes.add(vesselTracking.vessel_code);
                            locationMap.get(locationKey).affectedShipments.push({
                                vessel: vesselTracking.vessel_name,
                                vessel_code: vesselTracking.vessel_code,
                                originPort: vesselTracking.source || 'Unknown',
                                destinationPort: vesselTracking.destination || 'Unknown',
                                impact: portDelay.incidents?.length > 0 ? 
                                    incidentMap.get(portDelay.incidents[0].toString())?.severity : 1,
                                delay: `${total_delay || 0} Days`
                            });
                        }
                    }
                }
            } else {
                for (const seaDelay of delay.sea_delays || []) {
                    if (seaDelay?.lat_lon?.length === 2) {
                        const locationKey = `${seaDelay.lat_lon[0]},${seaDelay.lat_lon[1]}`;
                        
                        if (!locationMap.has(locationKey)) {
                            const locationName = await getLocationName(seaDelay.lat_lon[0], seaDelay.lat_lon[1]);
                            locationMap.set(locationKey, {
                                latitude: seaDelay.lat_lon[0].toString(),
                                longitude: seaDelay.lat_lon[1].toString(),
                                name: locationName,
                                affectedShipments: [],
                                uniqueVesselCodes: new Set()
                            });
                        }

                        // Get shipment details
                        const shipment = shipments.find(s => s._id.toString() === delay.shipment.toString());
                        const vesselTracking = shipment?.tracking_id;
                        const total_delay = await calculateTotalDelay(shipment._id);

                        if (vesselTracking?.vessel_name && vesselTracking.vessel_name !== 'Unknown Vessel' && 
                            !locationMap.get(locationKey).uniqueVesselCodes.has(vesselTracking.vessel_code)) {
                            locationMap.get(locationKey).uniqueVesselCodes.add(vesselTracking.vessel_code);
                            locationMap.get(locationKey).affectedShipments.push({
                                vessel: vesselTracking.vessel_name,
                                vessel_code: vesselTracking.vessel_code,
                                originPort: vesselTracking.source || 'Unknown',
                                destinationPort: vesselTracking.destination || 'Unknown',
                                impact: seaDelay.incidents?.length > 0 ? 
                                    incidentMap.get(seaDelay.incidents[0].toString())?.severity : 1,
                                delay: `${total_delay || 0} Days`
                            });
                        }
                    }
                }
            }
        }

        // Convert map to array and remove uniqueVesselCodes from the response
        const result = Array.from(locationMap.values()).map(location => {
            const { uniqueVesselCodes, ...cleanLocation } = location;
            return cleanLocation;
        });

        return result;
    } catch (error) {
        console.error('Error in getMapDataService:', error);
        throw error;
    }
};

module.exports = {
    getMapDataService
};
