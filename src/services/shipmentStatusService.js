const Shipment = require('../models/Shipment');
const Incident = require('../models/Incident');
const Port = require('../models/Port');
const User = require('../models/User');
const VesselTracking = require('../models/VesselTracking');
const Delay = require('../models/Delay');

class ShipmentStatusService {
    static getStatusFromSeverity(severity) {
        if (severity >= 8) return 'DANGER';
        if (severity >= 5) return 'CAUTION';
        return 'NOT_AFFECTED';
    }

    async getShipmentStatistics(email) {
        try {
            const user = await User.findOne({ email }).select('_id').lean();
            if (!user) throw new Error('User not found');

            const shipments = await Shipment.find({ client_id: user._id })
                .populate({
                    path: 'tracking_id',
                    match: { status: "intransit" },
                    select: 'status',
                })
                .lean();

            // Filter only shipments with tracking_id populated
            const activeShipments = shipments.filter(s => s.tracking_id);

            // Initialize stats
            const stats = {
                shipmentInTransit: activeShipments.length,
                shipmentNotAffected: 0,
                shipmentUnderCaution: 0,
                shipmentUnderDanger: 0
            };

            const shipmentIds = activeShipments.map(s => s._id);

            // Get all delays in one query
            const delays = await Delay.find({ shipment: { $in: shipmentIds } }).lean();

            // Map shipmentId -> delay
            const delayMap = new Map();
            delays.forEach(delay => delayMap.set(delay.shipment.toString(), delay));

            // Collect all incident IDs
            const incidentIdSet = new Set();
            const shipmentToIncidents = new Map();

            for (const shipment of activeShipments) {
                const delay = delayMap.get(shipment._id.toString());

                if (!delay) {
                    stats.shipmentNotAffected++;
                    continue;
                }

                let incidentIds = [];
                if (delay.location_type === 'port') {
                    incidentIds = delay.affected_ports.map(p => p.incident);
                } else if (delay.location_type === 'sea') {
                    incidentIds = delay.sea_delays.map(s => s.incident);
                }

                incidentIds.forEach(id => incidentIdSet.add(id.toString()));
                shipmentToIncidents.set(shipment._id.toString(), incidentIds);
            }

            // Fetch all incidents at once
            const incidents = await Incident.find({ _id: { $in: Array.from(incidentIdSet) } }).lean();
            const incidentSeverityMap = new Map();
            incidents.forEach(inc => incidentSeverityMap.set(inc._id.toString(), inc.severity));

            // Analyze incident severity per shipment
            for (const shipment of activeShipments) {
                const incidentIds = shipmentToIncidents.get(shipment._id.toString());
                if (!incidentIds || incidentIds.length === 0) continue;

                const severities = incidentIds
                    .map(id => incidentSeverityMap.get(id.toString()))
                    .filter(sev => typeof sev === 'number');

                if (severities.length === 0) {
                    stats.shipmentNotAffected++;
                    continue;
                }

                const avgSeverity = severities.reduce((sum, s) => sum + s, 0) / severities.length;

                if (avgSeverity >= 7) {
                    stats.shipmentUnderDanger++;
                } else {
                    stats.shipmentUnderCaution++;
                }
            }

            return {
                success: true,
                data: stats
            };
        } catch (error) {
            console.error('Error calculating shipment statistics:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new ShipmentStatusService();
