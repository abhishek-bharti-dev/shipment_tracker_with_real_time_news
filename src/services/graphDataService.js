const Shipment = require('../models/Shipment');
const User = require('../models/User');
const VesselTracking = require('../models/VesselTracking');

const getIntransitAndDelayedShipments = async (id) => {
    try {
        // console.log("id", id);
        const shipments = await Shipment.find({ client_id: id })
            .populate({
                path: 'tracking_id',
                select: 'status'
            });
        // console.log("shipments", shipments);


        // Initialize counters
        let shipmentInTransit = 0;
        let shipmentDelivered = 0;

        // return "hello";

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