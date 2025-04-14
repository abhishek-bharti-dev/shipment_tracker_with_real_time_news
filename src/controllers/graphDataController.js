const graphDataService = require('../services/graphDataService');

const intransitAndDelayedShipments = async (req, res) => {
    try {
        // Get user data from the authenticated request
        const user = req.user;
        // console.log("user", user);
        if (!user || !user.id) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }

        const result = await graphDataService.getIntransitAndDelayedShipments(user.id);
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