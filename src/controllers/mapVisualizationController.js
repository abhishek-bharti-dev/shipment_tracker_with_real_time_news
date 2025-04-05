const { getMapDataService } = require('../services/mapVisualizationService');

const getMapData = async (req, res) => {
    try {
        const email = req.user.email; // Get email from authenticated user
        const mapData = await getMapDataService(email);
        res.status(200).json(mapData);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    getMapData
}; 