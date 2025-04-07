const express = require('express');
const router = express.Router();
const {
    createIncident,
    getIncidents,
    getIncidentById,
    updateIncidentStatus
} = require('../controllers/incidentController');
const { authenticate } = require('../security/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// Create a new incident
router.post('/incidents', createIncident);

// Get all incidents
router.get('/incidents', getIncidents);

// Get incident by ID
router.get('/incidents/:id', getIncidentById);

// Update incident status
router.patch('/incidents/:id/status', updateIncidentStatus);

module.exports = router; 