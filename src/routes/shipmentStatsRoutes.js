const express = require('express');
const router = express.Router();
const shipmentStatusService = require('../services/shipmentStatusService');
const { authenticate } = require('../security/authMiddleware');
const { getShipmentStatistics } = require('../controllers/shipmentStatController');
router.use(authenticate);
router.get('/', getShipmentStatistics);

module.exports = router; 