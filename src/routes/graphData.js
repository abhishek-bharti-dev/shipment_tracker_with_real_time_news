const express = require('express');
const router = express.Router();
const { authenticate } = require('../security/authMiddleware');
const { intransitAndDelayedShipments } = require('../controllers/graphDataController');

router.use(authenticate);
router.get('/pie-chart-shipments', intransitAndDelayedShipments);

module.exports = router;