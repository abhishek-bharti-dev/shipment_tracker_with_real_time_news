const express = require('express');
const router = express.Router();
const shipmentStatusService = require('../services/shipmentStatusService');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route GET /api/shipment-stats
 * @description Get shipment statistics for the authenticated client
 * @access Private
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Get client ID from the authenticated user
        const clientId = req.user.userId;

        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: 'Client ID not found in token'
            });
        }

        const result = await shipmentStatusService.getShipmentStatistics(clientId);

        if (result.success) {
            res.status(200).json({
                success: true,
                data: result.data
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch shipment statistics',
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error in shipment stats route:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching shipment statistics',
            error: error.message
        });
    }
});

module.exports = router; 