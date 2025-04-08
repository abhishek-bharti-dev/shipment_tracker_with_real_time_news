const VesselTracking = require('../models/VesselTracking');
const Delay = require('../models/Delay');
const Incident = require('../models/Incident');
const User = require('../models/User');
const Shipment = require('../models/Shipment');

class VesselTrackingService {
    async getAllVesselsWithImpactAndDelay(userEmail) {
        try {
            // First get the user by email
            const user = await User.findOne({ email: userEmail });
            if (!user) {
                throw new Error('User not found');
            }
            
            // Get all the shipments associated with this user
            const shipments = await Shipment.find({ client_id: user._id });
            console.log("shipments: ", shipments.length);

            // Get all incidents for later use
            const incidents = await Incident.find({});
            
            const result = [];

            // Process each shipment sequentially
            for (const shipment of shipments) {
                // Get vessel details using tracking_id and check if status is "intransit"
                const vessel = await VesselTracking.findOne({ 
                    _id: shipment.tracking_id,
                    status: "intransit"
                });
                if (!vessel) continue;

                // Get delay information for this shipment
                const delay = await Delay.findOne({ shipment: shipment._id });
                console.log("delay: ", delay);
                
                let totalDelayDays = 0;
                let impactScore = 0;

                if (delay) {
                    console.log(" let's fix it")
                    console.log("delay: ", delay);
                    if (delay.location_type === 'port') {
                        // Sum up port delays
                        totalDelayDays = delay.affected_ports.reduce((sum, port) => sum + port.delay_days, 0);
                        
                        // Get incident IDs from affected ports
                        const incidentIds = delay.affected_ports.map(port => port.incident);
                        
                        // Fetch incidents directly using their IDs
                        const relevantIncidents = await Incident.find({
                            _id: { $in: incidentIds }
                        });
                        
                        if (relevantIncidents.length > 0) {
                            impactScore = relevantIncidents.reduce((sum, incident) => sum + incident.severity, 0) / relevantIncidents.length;
                        }
                    } else if (delay.location_type === 'sea') {
                        // Sum up sea delays
                        totalDelayDays = delay.sea_delays.reduce((sum, delay) => sum + delay.delay_days, 0);
                        
                        // For sea delays, we might want to consider different impact calculation
                        // This is a simplified version - adjust as needed
                        impactScore = totalDelayDays > 6 ? 5 : 0;
                    }
                }

                result.push({
                    vessel: vessel.vessel_name,
                    originPort: shipment.POL, // Using POL from shipment
                    destinationPort: shipment.POD, // Using POD from shipment
                    impact: Number(impactScore.toFixed(2)),
                    delay: `${totalDelayDays} ${totalDelayDays === 1 ? 'Day' : 'Days'}`,
                });
            }

            return result;
        } catch (error) {
            console.error('Error in getAllVesselsWithImpactAndDelay:', error);
            throw error;
        }
    }
}

module.exports = new VesselTrackingService(); 