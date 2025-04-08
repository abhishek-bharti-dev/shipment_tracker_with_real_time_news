const express = require('express');
const router = express.Router();
const resolveIncidentService = require('../services/resolveIncidentService');

// Resolve an incident
router.post('/resolve', (req, res) => {
    resolveIncidentService.resolveIncidents()
        .then(() => res.status(200).json({ message: 'Incidents resolved successfully' }))
        .catch(error => res.status(500).json({ error: error.message }));
});

module.exports = router;