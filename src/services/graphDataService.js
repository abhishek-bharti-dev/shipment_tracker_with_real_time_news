const User = require('../models/User');
const GocometShipload = require('../models/GocometShipload');

const getIntransitAndDelayedShipments = async (id) => {
    try {
        // Find user's shipload IDs from users table
        const user = await User.findById(id);
        if (!user) {
            return {
                shipmentInTransit: 0,
                shipmentDelivered: 0
            };
        }

        const shiploadsIds = user.shiploads_ids || [];
        if (shiploadsIds.length === 0) {
            return {
                shipmentInTransit: 0,
                shipmentDelivered: 0
            };
        }

        // Get in-transit shipments using aggregation
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

        // Get completed shipments using aggregation
        const completedShipments = await GocometShipload.aggregate([
            {
                $match: {
                    status: 3
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

        return {
            shipmentInTransit: inTransitShipments.length,
            shipmentDelivered: completedShipments.length
        };
    } catch (error) {
        console.error('Error in getIntransitAndDelayedShipments:', error);
        throw error;
    }
};

module.exports = {
    getIntransitAndDelayedShipments
};