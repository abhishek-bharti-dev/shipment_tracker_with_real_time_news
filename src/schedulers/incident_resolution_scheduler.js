const cron = require('node-cron');
const resolveIncidentService = require('../services/resolveIncidentService');

class IncidentResolutionScheduler {
    constructor() {
        this.schedule = '0 * * * *'; // Run every hour at minute 0
    }

    start() {
        console.log('Starting Incident Resolution Scheduler...');
        cron.schedule(this.schedule, async () => {
            try {
                console.log('Running incident resolution check...');
                await resolveIncidentService.resolveIncidents();
                console.log('Incident resolution check completed');
            } catch (error) {
                console.error('Error in incident resolution scheduler:', error);
            }
        });
    }
}

module.exports = new IncidentResolutionScheduler(); 