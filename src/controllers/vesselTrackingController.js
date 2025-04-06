const vesselTrackingService = require('../services/vesselTrackingService');
const User = require('../models/User');
const auth = require('../middlewares/auth');

class VesselTrackingController {
    async getAllVessels(req, res) {
        try {
            // Get user email from the authenticated user
            const email = req.user.email;
            const vesselData = await vesselTrackingService.getAllVesselsWithImpactAndDelay(email);
            res.json(vesselData);
        } catch (error) {
            console.error('Error fetching vessel data:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

module.exports = new VesselTrackingController(); 