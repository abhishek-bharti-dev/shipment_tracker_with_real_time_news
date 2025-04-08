const User = require('../models/User');
const Port = require('../models/Port');
const Shipment = require('../models/Shipment');
const Delay = require('../models/Delay');
const Incident = require('../models/Incident');
const VesselTracking = require('../models/VesselTracking');

const getMapDataService = async (email) => {
    try {
        const user = await User.findOne({ email });
        if (!user) throw new Error('User not found');

        // 1. Get all shipments for the user
        const shipments = await Shipment.find({ client_id: user._id })
            .populate({
                path: 'tracking_id',
                match: { status: "intransit" },
                select: 'status vessel_name lat_lon',
            })
            .lean();

        const shipmentIds = shipments.map(s => s._id);
        const delays = await Delay.find({ shipment: { $in: shipmentIds } }).lean();

        // 2. Collect all incident and port IDs
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

        // 3. Fetch all incidents and ports in bulk
        const incidents = await Incident.find({ _id: { $in: Array.from(incidentIds) } }).lean();
        const ports = await Port.find({ _id: { $in: Array.from(portIds) } }).lean();

        const incidentMap = new Map(incidents.map(i => [i._id.toString(), i]));
        const portMap = new Map(ports.map(p => [p._id.toString(), p.lat_lon]));

        // 4. Initialize mapData
        const mapData = {
            danger: { coordinates: [], names: [], radius: [] },
            caution: { coordinates: [], names: [], radius: [] },
            normal: { coordinates: [], names: [], radius: [] }
        };

        // 5. Process delays
        for (const delay of delays) {
            if (delay.location_type === 'port') {
                for (const portDelay of delay.affected_ports || []) {
                    const incident = incidentMap.get(portDelay.incident?.toString());
                    const coordinates = portMap.get(portDelay.port?.toString());
                    if (incident && coordinates?.length === 2) {
                        const severity = incident.severity;
                        const category = severity >= 7 ? 'danger' : 'caution';
                        mapData[category].coordinates.push(coordinates);
                        mapData[category].names.push(portDelay.port_name || 'Port');
                        mapData[category].radius.push(15);
                    }
                }
            } else {
                for (const seaDelay of delay.sea_delays || []) {
                    const incident = incidentMap.get(seaDelay.incident?.toString());
                    if (incident && incident.lat_lon?.length === 2) {
                        const severity = incident.severity;
                        const category = severity >= 7 ? 'danger' : 'caution';
                        mapData[category].coordinates.push(incident.lat_lon);
                        mapData[category].names.push('Sea Incident');
                        mapData[category].radius.push(15);
                    }
                }
            }
        }

        // 6. Find shipments without delays
        const delayedShipmentIds = new Set(delays.map(d => d.shipment?.toString()));
        const normalShipments = shipments.filter(s => !delayedShipmentIds.has(s._id.toString()));

        // 7. Add normal vessels
        for (const shipment of normalShipments) {
            const tracking = shipment.tracking_id;
            if (tracking?.lat_lon?.length === 2) {
                mapData.normal.coordinates.push(tracking.lat_lon);
                mapData.normal.names.push(tracking.vessel_name || 'Vessel');
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
