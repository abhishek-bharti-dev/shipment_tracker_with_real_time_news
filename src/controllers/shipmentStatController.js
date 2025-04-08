const shipmentStatusService = require('../services/shipmentStatusService');

const getShipmentStatistics = async (req, res) => {
    const email = req.user.email;
    const result = await shipmentStatusService.getShipmentStatistics(email);
    return res.json(result);
};

module.exports = {
    getShipmentStatistics
};