const vesselTrackingService = require('../services/vesselTrackingService');
const User = require('../models/User');
const auth = require('../middlewares/auth');

class VesselTrackingController {
    async getAllVessels(req, res) {
        try {
            // Get user email from the authenticated user
            const user_id = req.user.id;
            const vesselData = await vesselTrackingService.getAllVesselsWithImpactAndDelay(user_id);
            res.json({
                success: true,
                data: vesselData,
                message: 'Vessel data retrieved successfully'
            });
        } catch (error) {
            console.error('Error fetching vessel data:', error);
            res.status(500).json({
                success: false,
                data: null,
                message: 'Failed to fetch vessel data'
            });
        }
    }
}

module.exports = new VesselTrackingController(); 