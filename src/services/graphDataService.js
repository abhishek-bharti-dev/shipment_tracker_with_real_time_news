const Shipment = require('../models/Shipment');
const User = require('../models/User');
const VesselTracking = require('../models/VesselTracking');

const getIntransitAndDelayedShipments = async (email) => {
    try {
        // First fetch the user and get their _id
        const user = await User.findOne({ email: email });
        if (!user) {
            throw new Error('User not found');
        }
        const userId = user._id;

        // Get all shipments with their tracking information
        const shipments = await Shipment.find({ client_id: userId })
            .populate({
                path: 'tracking_id',
                select: 'status'
            });
        console.log("shipments", shipments);

        // Initialize counters
        let shipmentInTransit = 0;
        let shipmentDelivered = 0;

        // Count shipments by status
        shipments.forEach(shipment => {
            if (shipment.tracking_id) {
                if (shipment.tracking_id.status === 'intransit') {
                    shipmentInTransit++;
                } else if (shipment.tracking_id.status === 'delivered') {
                    shipmentDelivered++;
                }
            }
        });

        return {
            shipmentInTransit,
            shipmentDelivered
        };
    } catch (error) {
        console.error('Error in getIntransitAndDelayedShipments:', error);
        throw error;
    }
};

module.exports = {
    getIntransitAndDelayedShipments
}; 