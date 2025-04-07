const delayService = require('../services/delayService');

/**
 * Controller to process a delay for a shipment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const processDelay = async (req, res) => {
    try {
        const result = await delayService.processUnupdatedDelayIncidents();
        return res.json({
            success: true,
            data: result,
            message: 'Delay processed successfully'
        });
    } catch (error) {
        console.error('Error in delayController.processDelay:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error while processing delay'
        });
    }
};

module.exports = {
    processDelay
}; 