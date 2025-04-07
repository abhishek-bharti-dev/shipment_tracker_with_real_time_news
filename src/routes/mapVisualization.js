const express = require('express');
const router = express.Router();
const { getMapData } = require('../controllers/mapVisualizationController');
const { authenticate } = require('../security/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// Route to get map data
router.get('/map-data', getMapData);

module.exports = router;
