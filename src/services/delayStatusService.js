const Incident = require('../models/Incident');
const Delay = require('../models/Delay');

class DelayStatusService {
    /**
     * Get the status of a delay based on its incidents
     * @param {string} delayId - The ID of the delay to check
     * @returns {Promise<Object>} - Returns the delay status and details
     */
    async getDelayStatus(delayId) {
        try {
            // Get the delay with all its incidents
            const delay = await Delay.findById(delayId);
            if (!delay) {
                return {
                    success: false,
                    error: 'Delay not found'
                };
            }

            // Collect all incident IDs
            const incidentIds = new Set();
            
            // Get incident IDs from affected ports
            if (delay.affected_ports && delay.affected_ports.length > 0) {
                delay.affected_ports.forEach(port => {
                    if (port.incidents && Array.isArray(port.incidents)) {
                        port.incidents.forEach(id => incidentIds.add(id.toString()));
                    }
                });
            }

            // Get incident IDs from sea delays
            if (delay.sea_delays && delay.sea_delays.length > 0) {
                delay.sea_delays.forEach(seaDelay => {
                    if (seaDelay.incidents && Array.isArray(seaDelay.incidents)) {
                        seaDelay.incidents.forEach(id => incidentIds.add(id.toString()));
                    }
                });
            }

            // Get all incidents
            const incidents = await Incident.find({ _id: { $in: Array.from(incidentIds) } });
            
            // Calculate average severity
            const severities = incidents.map(inc => inc.severity);
            const avgSeverity = severities.reduce((sum, s) => sum + s, 0) / severities.length;

            // Determine status based on severity
            let status = 'NOT_AFFECTED';
            if (avgSeverity >= 8) {
                status = 'DANGER';
            } else if (avgSeverity >= 5) {
                status = 'CAUTION';
            }

            return {
                success: true,
                data: {
                    delayId: delay._id,
                    status,
                    averageSeverity: avgSeverity,
                    totalIncidents: incidents.length,
                    incidents: incidents.map(inc => ({
                        id: inc._id,
                        severity: inc.severity,
                        status: inc.status,
                        locationType: inc.location_type
                    }))
                }
            };
        } catch (error) {
            console.error('Error getting delay status:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get status for multiple delays
     * @param {Array<string>} delayIds - Array of delay IDs to check
     * @returns {Promise<Object>} - Returns status for all delays
     */
    async getMultipleDelayStatuses(delayIds) {
        try {
            const results = await Promise.all(
                delayIds.map(id => this.getDelayStatus(id))
            );

            return {
                success: true,
                data: results.map(result => result.data)
            };
        } catch (error) {
            console.error('Error getting multiple delay statuses:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new DelayStatusService(); 