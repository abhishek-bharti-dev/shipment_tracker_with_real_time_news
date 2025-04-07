const incidentService = require('../services/incidentService');
const delayService = require('../services/delayService');

const createIncident = async (req, res) => {
    try {
        const incident = await incidentService.createIncident(req.body);
        res.status(201).json({
            success: true,
            data: incident,
            message: 'Incident created successfully'
        });
    } catch (error) {
        console.error('Error creating incident:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: 'Failed to create incident'
        });
    }
};

const getIncidents = async (req, res) => {
    try {
        const email = req.user.email; // Get email from authenticated user
        const incidents = await incidentService.getIncidents(email);
        res.json({
            success: true,
            data: incidents,
            message: 'Incidents retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching incidents:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: 'Failed to fetch incidents'
        });
    }
};

const getIncidentById = async (req, res) => {
    try {
        const incident = await incidentService.getIncidentById(req.params.id);
        if (!incident) {
            return res.status(404).json({
                success: false,
                data: null,
                message: 'Incident not found'
            });
        }
        res.json({
            success: true,
            data: incident,
            message: 'Incident retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching incident:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: 'Failed to fetch incident'
        });
    }
};

const updateIncidentStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['ongoing', 'resolved'].includes(status.toLowerCase())) {
            return res.status(400).json({
                success: false,
                data: null,
                message: 'Invalid status'
            });
        }
        const incident = await incidentService.updateIncidentStatus(req.params.id, status);
        if (!incident) {
            return res.status(404).json({
                success: false,
                data: null,
                message: 'Incident not found'
            });
        }
        res.json({
            success: true,
            data: incident,
            message: 'Incident status updated successfully'
        });
    } catch (error) {
        console.error('Error updating incident status:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: 'Failed to update incident status'
        });
    }
};

/**
 * Process all unupdated delay incidents
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const processUnupdatedDelayIncidents = async (req, res) => {
    try {
        const results = await delayService.processUnupdatedDelayIncidents();
        
        res.status(200).json({
            success: true,
            message: 'Successfully processed unupdated delay incidents',
            data: results
        });
    } catch (error) {
        console.error('Error in processUnupdatedDelayIncidents controller:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing unupdated delay incidents',
            error: error.message
        });
    }
};

module.exports = {
    createIncident,
    getIncidents,
    getIncidentById,
    updateIncidentStatus,
    processUnupdatedDelayIncidents
}; 