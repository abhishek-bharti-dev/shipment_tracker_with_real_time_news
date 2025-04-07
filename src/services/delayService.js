const mongoose = require('mongoose');
const Delay = require('../models/Delay');
const VesselTracking = require('../models/VesselTracking');
const Port = require('../models/Port');
const Incident = require('../models/Incident');
const User = require('../models/User');
const emailService = require('./emailService');

class DelayService {
    /**
     * Calculate total delay for a shipment
     * @param {string} shipmentId - The ID of the shipment
     * @returns {Promise<number>} Total delay in days
     */
    async calculateTotalDelay(shipmentId) {
        try {
            const delays = await Delay.find({ shipment: shipmentId });
            let totalDelay = 0;

            for (const delay of delays) {
                if (delay.location_type === 'port') {
                    // Sum up delay days from all affected ports
                    totalDelay += delay.affected_ports.reduce((sum, port) => sum + port.delay_days, 0);
                } else {
                    // Sum up delay days from all sea delays
                    totalDelay += delay.sea_delays.reduce((sum, sea) => sum + sea.delay_days, 0);
                }
            }

            return totalDelay;
        } catch (error) {
            console.error('Error in calculateTotalDelay:', error);
            throw error;
        }
    }

    /**
     * Get all incidents where delay_updated is false
     * @returns {Promise<Array>} Array of incidents
     */
    async getUnupdatedDelayIncidents() {
        try {
            const incidents = await Incident.find({ delay_updated: false })
                .populate('source_news')
                .populate('affected_ports');
            
            return incidents;
        } catch (error) {
            console.error('Error fetching unupdated delay incidents:', error);
            throw error;
        }
    }

    /**
     * Process unupdated delay incidents
     * @returns {Promise<Object>} Processing results
     */
    async processUnupdatedDelayIncidents() {
        try {
            // Get all incidents where delay_updated is false
            const unupdatedIncidents = await Incident.find({ delay_updated: false })
                .populate('source_news')
                .populate('affected_ports');
            // console.log(unupdatedIncidents);

            const results = {
                processed: 0,
                skipped: 0,
                errors: 0,
                details: []
            };

            for (const incident of unupdatedIncidents) {
                try {
                    if (incident.location_type === 'sea') {
                        // Dummy response for sea incidents
                        results.details.push({
                            incidentId: incident._id,
                            type: 'sea',
                            status: 'skipped',
                            message: 'Sea incident processing to be implemented later'
                        });
                        results.skipped++;
                        continue;
                    }

                    // Process port incidents
                    const affectedPorts = incident.affected_ports;
                    for (const port of affectedPorts) {
                        // console.log(port.port_code);
                        // Find vessels that have this port in their events but no actual arrival time
                        const vessels = await VesselTracking.find({
                            'events': {
                                $elemMatch: {
                                    'port_code': port.port_code,
                                    'actual_time_of_arrival': { $exists: false }
                                }
                            }
                        });
                        // console.log(vessels);
                        for (const vessel of vessels) {
                            const delay = await this.calculateDelay(incident, vessel);
                            // console.log(delay);
                            if (delay > 0) {
                                // Create or update delay record
                                await Delay.findOneAndUpdate(
                                    {
                                        shipment: vessel.shipment_id,
                                        location_type: 'port'
                                    },
                                    {
                                        $push: {
                                            affected_ports: {
                                                port: port._id,
                                                incident: incident._id,
                                                delay_days: delay
                                            }
                                        }
                                    },
                                    { upsert: true, new: true }
                                );
                            }
                        }
                    }

                    // Mark incident as processed
                    await Incident.findByIdAndUpdate(incident._id, { delay_updated: true });

                    results.details.push({
                        incidentId: incident._id,
                        type: 'port',
                        status: 'processed',
                        message: 'Successfully processed port incident'
                    });
                    results.processed++;
                } catch (error) {
                    console.error(`Error processing incident ${incident._id}:`, error);
                    results.details.push({
                        incidentId: incident._id,
                        type: incident.location_type,
                        status: 'error',
                        message: error.message
                    });
                    results.errors++;
                }
            }

            return results;
        } catch (error) {
            console.error('Error in processUnupdatedDelayIncidents:', error);
            throw error;
        }
    }

    /**
     * Calculate delay in days for a vessel based on incident
     * @param {Object} incident - The incident document
     * @param {Object} vessel - The vessel tracking document
     * @returns {Number} Delay in days
     */
    async calculateDelay(incident, vessel) {
        try {
            // Find the relevant event for the port
            const portEvent = vessel.events.find(event => 
                event.port_code && 
                incident.affected_ports.some(port => port.port_code === event.port_code)
            );
            // console.log(portEvent);

            if (!portEvent || !portEvent.expected_time_of_arrival) {
                return 0;
            }

            const expectedArrival = new Date(portEvent.expected_time_of_arrival);
            const incidentCreatedAt = new Date(incident.createdAt);
            const incidentDelay = incident.estimated_duration_days;
            // console.log("expectedArrival", expectedArrival);
            // console.log("incidentCreatedAt", incidentCreatedAt);
            // console.log("incidentDelay", incidentDelay);

            // Calculate total delay
            const totalDelay = Math.max(0, incidentDelay - 
                Math.floor((expectedArrival - incidentCreatedAt) / (1000 * 60 * 60 * 24)));

            return totalDelay;
        } catch (error) {
            console.error('Error in calculateDelay:', error);
            throw error;
        }
    }
}

module.exports = new DelayService(); 