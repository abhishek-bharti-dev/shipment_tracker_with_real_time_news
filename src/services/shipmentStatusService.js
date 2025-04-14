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

    async getShipmentStatistics(user_id) {
        try {
            console.log("user_id", user_id);
            const shipments = await Shipment.find({ client_id: user_id }).populate('tracking_id');
            const shipmentInTransit = [];
            for(const shipment of shipments){
                // console.log("shipment", shipment)
                if(shipment.tracking_id.status === 'intransit'){
                    shipmentInTransit.push(shipment);
                }
            }
            // console.log("shipments", shipmentInTransit);
            console.log("shipments.length", shipmentInTransit.length);
            // return shipmentInTransit;

            // Initialize stats
            const stats = {
                shipmentInTransit: shipmentInTransit.length,
                shipmentNotAffected: 0,
                shipmentUnderCaution: 0,
                shipmentUnderDanger: 0
            };

            const shipmentIds = shipmentInTransit.map(s => s._id);
            // console.log("shipmentIds", shipmentIds);
            // return shipmentIds;

            // Get all delays in one query
            const delays = await Delay.find({ shipment: { $in: shipmentIds } });
            // console.log("delays", delays);
            // console.log("delays.length", delays.length);
            stats.shipmentNotAffected = shipmentInTransit.length - delays.length;

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
                    // console.log("delay.sea_delays", delay.sea_delays);
                    delay.sea_delays.forEach(seaDelay => {
                        if (seaDelay.incidents && Array.isArray(seaDelay.incidents)) {
                            // console.log("seaDelay", seaDelay.incidents);
                            incidentIdsForDelay.push(...seaDelay.incidents);
                            seaDelay.incidents.forEach(id => incidentIds.add(id.toString()));
                        }
                    });
                }
                shipmentToIncidents.set(delay.shipment.toString(), incidentIdsForDelay);
            }

            console.log("incidentIds", incidentIds);
            console.log("shipmentwithdelays", delays.length);

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
