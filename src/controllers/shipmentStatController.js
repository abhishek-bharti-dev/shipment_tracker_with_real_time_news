const shipmentStatusService = require('../services/shipmentStatusService');

const getShipmentStatistics = async (req, res) => {
    const user_id = req.user.id;
    // console.log("email", email);
    // return res.json({
    //     success: true,
    //     data: email,
    //     message: 'Shipment statistics fetched successfully'
    // });
    const result = await shipmentStatusService.getShipmentStatistics(user_id);
    return res.json(result);
};

module.exports = {
    getShipmentStatistics
};