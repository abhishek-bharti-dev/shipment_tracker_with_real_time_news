const express = require('express');
const router = express.Router();
const vesselTrackingController = require('../controllers/vesselTrackingController');
const { authenticate } = require('../security/authMiddleware');

// Apply auth middleware to all routes
router.use(authenticate);

// Get all vessels with impact and delay
router.get('/vessels', vesselTrackingController.getAllVessels);

module.exports = router; 