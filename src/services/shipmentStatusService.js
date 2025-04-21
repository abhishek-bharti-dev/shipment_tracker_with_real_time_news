const Shipment = require('../models/Shipment');
const Incident = require('../models/Incident');
const Port = require('../models/Port');
const VesselTracking = require('../models/VesselTracking');
const Delay = require('../models/Delay');
const User = require('../models/User')
const GocometShipload = require('../models/GocometShipload')
const { Buffer } = require('buffer');

class ShipmentStatusService {
    static getStatusFromSeverity(severity) {
        if (severity >= 8) return 'DANGER';
        if (severity >= 5) return 'CAUTION';
        return 'NOT_AFFECTED';
    }

    async getShipmentStatistics(user_id) {
        try {
            // console.log("user_id", user_id);
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

            // console.log("in transit shipments:- ",inTransitShipments.length);

            // Initialize stats
            const stats = {
                shipmentInTransit: inTransitShipments.length,
                shipmentNotAffected: 0,
                shipmentUnderCaution: 0,
                shipmentUnderDanger: 0
            };

            if (inTransitShipments.length === 0) {
                return {
                    success: true,
                    data: stats
                };
            }

            const shipmentIds = inTransitShipments.map(s => s.id);
            // console.log("shipment in transit ids ",shipmentIds);

            // Get all delays for these shipments
            const delays = await Delay.find({ shipment: { $in: shipmentIds } });
            // console.log(delays);
            stats.shipmentNotAffected = inTransitShipments.length - delays.length;

            // Collect all incident IDs from affected ports and sea delays
            const incidentIds = new Set();
            const shipmentToIncidents = new Map();

            for (const delay of delays) {
                const incidentIdsForDelay = [];
                
                // Get incident IDs from affected ports
                if (delay.affected_ports && delay.affected_ports.length > 0) {
                    delay.affected_ports.forEach(port => {
                        if (port.incidents && Array.isArray(port.incidents)) {
                            incidentIdsForDelay.push(...port.incidents);
                            port.incidents.forEach(id => incidentIds.add(id.toString()));
                        }
                    });
                }

                // Get incident IDs from sea delays
                if (delay.sea_delays && delay.sea_delays.length > 0) {
                    delay.sea_delays.forEach(seaDelay => {
                        if (seaDelay.incidents && Array.isArray(seaDelay.incidents)) {
                            incidentIdsForDelay.push(...seaDelay.incidents);
                            seaDelay.incidents.forEach(id => incidentIds.add(id.toString()));
                        }
                    });
                }
                shipmentToIncidents.set(delay.shipment.toString(), incidentIdsForDelay);
            }

            // Fetch all incidents at once
            const incidents = await Incident.find({ _id: { $in: Array.from(incidentIds) } }).lean();
            const incidentSeverityMap = new Map();
            incidents.forEach(inc => incidentSeverityMap.set(inc._id.toString(), inc.severity));

            // Calculate average severity for each shipment and categorize
            for (const [shipmentId, incidentIds] of shipmentToIncidents) {
                const severities = incidentIds
                    .map(id => incidentSeverityMap.get(id.toString()))
                    .filter(sev => typeof sev === 'number');

                if (severities.length === 0) continue;

                const avgSeverity = severities.reduce((sum, s) => sum + s, 0) / severities.length;

                if (avgSeverity > 7) {
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
