const mongoose = require('mongoose');
const Delay = require('../models/Delay');
const VesselTracking = require('../models/VesselTracking');
const Port = require('../models/Port');
const Incident = require('../models/Incident');
const User = require('../models/User');
const Shipment = require('../models/Shipment');
const emailService = require('./emailService');

class DelayService {
    // Haversine formula to calculate distance between two points on Earth
    calculateDistance(lat1, lon1, lat2, lon2) {
        // console.log(lat1, lon1, lat2, lon2);
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRad(degrees) {
        return degrees * (Math.PI/180);
    }

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
                    console.log(incident.location_type);
                    if (incident.location_type === 'sea') {
                        // Find vessels that are in transit
                        const vesselsInTransit = await VesselTracking.find({
                            status: 'intransit'
                        });

                        for (const vessel of vesselsInTransit) {
                            // Get shipment ID from Shipment model using tracking ID
                            const shipment = await Shipment.findOne({ tracking_id: vessel._id });
                            if (!shipment) {
                                console.log(`No shipment found for vessel tracking ID: ${vessel._id}`);
                                continue;
                            }

                            // Calculate distance between vessel and incident location
                            const distance = this.calculateDistance(
                                vessel.lat_lon[0],
                                vessel.lat_lon[1],
                                incident.lat_lon[0],
                                incident.lat_lon[1]
                            );
                            // console.log(distance);

                            // If vessel is within 15km of incident
                            if (distance <= 15) {
                                const delay = await this.calculateDelay(incident, vessel);
                                // console.log("sea wala delay", delay);
                                if (delay > 0) {
                                    // Create or update delay record
                                    await Delay.findOneAndUpdate(
                                        {
                                            shipment: shipment._id,
                                            location_type: 'sea'
                                        },
                                        {
                                            $push: {
                                                sea_delays: {
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
                            type: 'sea',
                            status: 'processed',
                            message: 'Successfully processed sea incident'
                        });
                        results.processed++;
                        continue;
                    }

                    // Process port incidents
                    const affectedPorts = incident.affected_ports;
                    for (const port of affectedPorts) {
                        // Find vessels that have this port in their events but no actual arrival time
                        const vessels = await VesselTracking.find({
                            'events': {
                                $elemMatch: {
                                    'port_code': port.port_code,
                                    'actual_time_of_arrival': { $exists: false }
                                }
                            }
                        });

                        for (const vessel of vessels) {
                            // Get shipment ID from Shipment model using tracking ID
                            const shipment = await Shipment.findOne({ tracking_id: vessel._id });
                            if (!shipment) {
                                console.log(`No shipment found for vessel tracking ID: ${vessel._id}`);
                                continue;
                            }

                            const delay = await this.calculateDelay(incident, vessel);
                            // console.log("port wala delay", delay);
                            if (delay > 0) {
                                // Create or update delay record
                                await Delay.findOneAndUpdate(
                                    {
                                        shipment: shipment._id,
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