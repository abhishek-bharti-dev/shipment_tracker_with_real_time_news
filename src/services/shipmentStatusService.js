const Shipment = require('../models/Shipment');
const Incident = require('../models/Incident');
const Port = require('../models/Port');

class ShipmentStatusService {
    /**
     * Calculate shipment status based on incident severity
     * @param {number} severity - Incident severity (1-10)
     * @returns {string} - Status category
     */
    static getStatusFromSeverity(severity) {
        if (severity >= 8) return 'DANGER';
        if (severity >= 5) return 'CAUTION';
        return 'NOT_AFFECTED';
    }

    /**
     * Get shipment statistics for a specific client
     * @param {string} clientId - Client's ID
     * @returns {Promise<Object>} Shipment statistics
     */
    async getShipmentStatistics(clientId) {
        try {
            // Get all shipments for the client with tracking info
            const shipments = await Shipment.find({ client_id: clientId })
                .populate({
                    path: 'tracking_id',
                    select: 'status current_port destination_port'
                });

            // Get all ongoing incidents with populated port information
            const activeIncidents = await Incident.find({ 
                status: 'ongoing',
                severity: { $exists: true }
            }).populate('affected_ports');

            // Get all ports for reference
            const ports = await Port.find({});
            const portMap = new Map(ports.map(port => [port.port_code, port._id.toString()]));

            let stats = {
                shipmentInTransit: 0,
                shipmentNotAffected: 0,
                shipmentUnderCaution: 0,
                shipmentUnderDanger: 0
            };

            console.log('Processing shipments:', shipments.length);
            console.log('Active incidents:', activeIncidents.length);

            // Process each shipment
            for (const shipment of shipments) {
                let highestSeverity = 0;
                let isAffected = false;

                // Get port IDs for POL and POD
                const polId = portMap.get(shipment.POL);
                const podId = portMap.get(shipment.POD);

                console.log(`Shipment ${shipment.shipment_id}:`);
                console.log(`- POL: ${shipment.POL} (${polId})`);
                console.log(`- POD: ${shipment.POD} (${podId})`);

                // Check if shipment is in transit
                const isInTransit = shipment.tracking_id && 
                    (shipment.tracking_id.status === 'IN_TRANSIT' || 
                     shipment.tracking_id.status === 'DELAYED');
                
                if (isInTransit) {
                    stats.shipmentInTransit++;
                    console.log('- Status: In Transit');
                }

                // Check each incident
                for (const incident of activeIncidents) {
                    // Convert affected_ports to array of strings for comparison
                    const affectedPortIds = incident.affected_ports.map(port => port._id.toString());

                    // Check if either POL or POD is affected
                    const isPortAffected = (polId && affectedPortIds.includes(polId)) || 
                                        (podId && affectedPortIds.includes(podId));

                    if (isPortAffected) {
                        isAffected = true;
                        highestSeverity = Math.max(highestSeverity, incident.severity);
                        console.log(`- Affected by incident: severity ${incident.severity}`);
                    }
                }

                // Determine status based on highest severity
                if (isAffected) {
                    const status = ShipmentStatusService.getStatusFromSeverity(highestSeverity);
                    console.log(`- Final status: ${status}`);
                    switch (status) {
                        case 'DANGER':
                            stats.shipmentUnderDanger++;
                            break;
                        case 'CAUTION':
                            stats.shipmentUnderCaution++;
                            break;
                        default:
                            stats.shipmentNotAffected++;
                            break;
                    }
                } else {
                    stats.shipmentNotAffected++;
                    console.log('- Final status: NOT_AFFECTED (no incidents)');
                }
            }

            console.log('Final stats:', stats);

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