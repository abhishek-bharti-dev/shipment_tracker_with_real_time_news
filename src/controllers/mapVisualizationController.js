const { getMapDataService } = require('../services/mapVisualizationService');

const getMapData = async (req, res) => {
    try {
        const email = req.user.email; // Get email from authenticated user
        const mapData = await getMapDataService(email);
        res.status(200).json({
            success: true,
            data: mapData,
            message: 'Map data retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            data: null,
            message: 'Failed to fetch map data'
        });
    }
};

module.exports = {
    getMapData
}; 