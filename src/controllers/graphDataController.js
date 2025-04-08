const graphDataService = require('../services/graphDataService');

const intransitAndDelayedShipments = async (req, res) => {
    try {
        const email = req.user.email; // Get email from authenticated user
        const result = await graphDataService.getIntransitAndDelayedShipments(email);
        return res.json({
            success: true,
            data: result,
            message: 'Intransit and delayed shipments fetched successfully'
        });
    } catch (error) {
        console.error('Error in graphDataController.getIntransitAndDelayedShipments:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error while fetching intransit and delayed shipments'
        });
    }
};

module.exports = {
    intransitAndDelayedShipments
}; 