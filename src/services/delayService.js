const mongoose = require('mongoose');
const Delay = require('../models/Delay');
const VesselTracking = require('../models/VesselTracking');
const Port = require('../models/Port');
const Incident = require('../models/Incident');
const User = require('../models/User');
const Shipment = require('../models/Shipment');
const emailService = require('./emailService');
const notificationHandler = require('../handlers/notificationHandler');
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

    async handlePortDelay(incident, vessel, shipment, portCode) {
        try {
            // Find existing delay record for this shipment
            let delayRecord = await Delay.findOne({ shipment: shipment._id });

            // If no delay record exists, create a new one
            if (!delayRecord) {
                delayRecord = new Delay({
                    shipment: shipment._id,
                    location_type: 'port',
                    affected_ports: []
                });
            }

            // Find if this port already has a delay record
            const existingPortDelay = delayRecord.affected_ports.find(
                port => port.port_code === portCode
            );

            // Calculate the delay considering overlapping incidents
            const delayDays = await this.calculateOverlappingDelay(incident, vessel, portCode);

            if (existingPortDelay) {
                // If port exists, update the delay and add the incident
                existingPortDelay.delay_days = Math.max(existingPortDelay.delay_days, delayDays);
                if (!existingPortDelay.incidents.includes(incident._id)) {
                    existingPortDelay.incidents.push(incident._id);
                }
                existingPortDelay.updatedAt = new Date();
            } else {
                // If port doesn't exist, add a new port delay record
                console.log("incident_id", incident);
                delayRecord.affected_ports.push({
                    port_code: portCode,
                    delay_days: delayDays,
                    incidents: [incident._id],
                    updatedAt: new Date()
                });
            }

            // Save the updated delay record
            await delayRecord.save();
            
            
                // Increment total_shipments_affected for the incident
                await Incident.findByIdAndUpdate(incident._id, { 
                    $inc: { total_shipments_affected: 1 },
                    delay_updated: true 
                });
            

            return delayRecord;
        } catch (error) {
            console.error('Error in handlePortDelay:', error);
            throw error;
        }
    }

    /**
     * Calculate delay considering overlapping incidents
     * @param {Object} incident - The current incident
     * @param {Object} vessel - The vessel tracking document
     * @returns {Number} Calculated delay in days
     */
    async calculateOverlappingDelay(incident, vessel, portCode) {
        try {
            const today = new Date();
            
            // Get all incidents affecting this port
            const allIncidents = await Incident.find({
                'affected_ports.port_code': portCode,
                delay_updated: true
            }).sort({ createdAt: 1 });

            // Create time intervals for all incidents
            const intervals = allIncidents.map(inc => {
                const endDate = new Date(inc.createdAt.getTime() + inc.estimated_duration_days * 24 * 60 * 60 * 1000);
                return {
                    start: inc.createdAt,
                    end: endDate > today ? today : endDate,
                    delay: inc.estimated_duration_days
                };
            });

            // Add the current incident
            const currentEndDate = new Date(incident.createdAt.getTime() + incident.estimated_duration_days * 24 * 60 * 60 * 1000);
            intervals.push({
                start: incident.createdAt,
                end: currentEndDate > today ? today : currentEndDate,
                delay: incident.estimated_duration_days
            });

            // Sort intervals by start time
            intervals.sort((a, b) => a.start - b.start);

            // Merge overlapping intervals
            const mergedIntervals = [];
            let currentInterval = intervals[0];

            for (let i = 1; i < intervals.length; i++) {
                if (intervals[i].start <= currentInterval.end) {
                    // Overlapping intervals, merge them
                    currentInterval.end = new Date(Math.max(currentInterval.end.getTime(), intervals[i].end.getTime()));
                    currentInterval.delay = Math.max(currentInterval.delay, intervals[i].delay);
                } else {
                    mergedIntervals.push(currentInterval);
                    currentInterval = intervals[i];
                }
            }
            mergedIntervals.push(currentInterval);

            // Calculate total delay
            const totalDelay = mergedIntervals.reduce((sum, interval) => {
                const days = Math.ceil((interval.end - interval.start) / (1000 * 60 * 60 * 24));
                return sum + Math.max(days, interval.delay);
            }, 0);

            return totalDelay;
        } catch (error) {
            console.error('Error in calculateOverlappingDelay:', error);
            throw error;
        }
    }

    async processUnupdatedDelayPort() {
        try {
            let vessels=[]
            const incidents = await Incident.find({ delay_updated: false })
                .populate('source_news')
                .populate('affected_ports');
            // filter those incident where location_type is port
            const portIncidents = incidents.filter(incident => incident.location_type === 'port');
            // console.log(portIncidents.length);
            // console.log(portIncidents);
            // get all the port codes from the portIncidents
            const portCodes = portIncidents.map(incident => incident.affected_ports.map(port => port.port_code));
            // console.log(portCodes);

            // get all who are in transit
            const vesselsInTransit = await VesselTracking.find({ status: 'intransit' });
            // console.log(vesselsInTransit.length);
            // console.log(vesselsInTransit);
            //loop over incidents and check if the port code is in the vesselsInTransit also it it present it should not have actual_time_of_arrival
            // console.log('\n=== Starting Port-Vessel Matching Analysis ===');
            // console.log(`Total Port Incidents: ${portIncidents.length}`);
            // console.log(`Total Vessels in Transit: ${vesselsInTransit.length}\n`);

            for (const incident of portIncidents) {
                for (const port of incident.affected_ports) {
                    let matchFound = false;
                    for (const vessel of vesselsInTransit) {
                        const matchingEvent = vessel.events.find(event => event.port_code === port.port_code);
                        //check for that port it should not have actual_time_of_arrival
                        const portEvent = vessel.events.find(event => event.port_code === port.port_code);
                        
                        if (portEvent && !portEvent.actual_time_of_arrival) {
                            matchFound = true;
                            console.log("incident_id", incident._id);
                            console.log("vessel_id", vessel._id);
                            const shipment = await Shipment.findOne({ tracking_id: vessel._id });
                            if (!shipment) {
                                console.log(`No shipment found for vessel tracking ID: ${vessel._id}`);
                                continue;
                            }
                            console.log("shipment_id", shipment._id);
                            console.log("port_code", port.port_code);
                            console.log("delay_days", incident.estimated_duration_days);
                                                       
                            if (!matchingEvent.actual_time_of_arrival) {
                                await this.handlePortDelay(incident, vessel, shipment, port.port_code);
                                vessels.push(vessel);
                            }
                        }
                    }
                    
                }
            }
            
            console.log('\n=== Final Results for port incidents ===');
            console.log(`Total Vessels Added: ${vessels.length}`);
            console.log('Vessel IDs:', vessels.map(v => v._id));
            console.log('================================\n');
            return vessels;
        } catch (error) {
            console.error('Error fetching unupdated delay incidents:', error);
            throw error;
        }
    }

    async calculateSeaDelay(incident) {
        try {
            const incidentDate = new Date(incident.createdAt);
            const estimatedEndDate = new Date(incidentDate.getTime() + incident.estimated_duration_days * 24 * 60 * 60 * 1000);
            const today = new Date();
            
            // If the estimated end date is in the future, calculate remaining delay
            if (estimatedEndDate > today) {
                const remainingDelayDays = Math.ceil((estimatedEndDate - today) / (1000 * 60 * 60 * 24));
                return remainingDelayDays;
            }
            
            // If the estimated end date has passed, return 0 as there's no remaining delay
            return 0;
        } catch (error) {
            console.error('Error in calculateSeaDelay:', error);
            throw error;    
        }
    }

    async handleSeaDelay(incident, vessel, shipment) {
        try {
            // console.log("incident_id", incident._id);
            // console.log("vessel_id", vessel._id);
            // console.log("shipment_id", shipment._id);
            // return;
            // Find existing delay record for this shipment
            let delayRecord = await Delay.findOne({ shipment: shipment._id });

            if (!delayRecord) {
                delayRecord = new Delay({
                    shipment: shipment._id,
                    location_type: 'sea',
                    sea_delays: []
                });
            }

            // return ;

            // Calculate the delay considering overlapping incidents
            const delayDays = await this.calculateSeaDelay(incident, vessel);
            // console.log("delayDays", delayDays);
            if (delayRecord) {
                // If port exists, update the delay and add the incident
                // console.log("yea hai bhai sea wala incident");
                // console.log(incident._id);
                delayRecord.sea_delays.push({
                    lat_lon: incident.lat_lon,
                    incidents: [incident._id],
                    delay_days: delayDays,
                    updatedAt: new Date()
                }); 
                await delayRecord.save();
                await Incident.findByIdAndUpdate(incident._id, { delay_updated: true });
                await Incident.findByIdAndUpdate(incident._id, { $inc: { total_shipments_affected: 1 } });
            }   
        } catch (error) {
            console.error('Error in handleSeaDelay:', error);
            throw error;
        }
    }

    async processUnupdatedDelaySea() {
        try {
            const incidents = await Incident.find({ delay_updated: false })
                .populate('source_news')
                .populate('affected_ports');
            // filter those incident where location_type is sea
            const seaIncidents = incidents.filter(incident => incident.location_type === 'sea');
            // console.log("seaIncidents", seaIncidents);
            // console.log(seaIncidents.length);
            
            // get all the vessels in transit
            const vesselsInTransit = await VesselTracking.find({ status: 'intransit' });
            // console.log(vesselsInTransit.length);
            
            // console.log('\n=== Starting Sea Incident-Vessel Distance Analysis ===');
            // console.log(`Total Sea Incidents: ${seaIncidents.length}`);
            // console.log(`Total Vessels in Transit: ${vesselsInTransit.length}\n`);
            
            for (const incident of seaIncidents) {
                // console.log(`\nAnalyzing Incident ID: ${incident._id}`);
                // console.log(`Incident Location (lat, lon): ${incident.lat_lon}`);
                
                for (const vessel of vesselsInTransit) {
                    if (vessel.lat_lon && vessel.lat_lon.length === 2) {
                        const distance = this.calculateDistance(
                            incident.lat_lon[0],
                            incident.lat_lon[1],
                            vessel.lat_lon[0],
                            vessel.lat_lon[1]
                        );
                        const shipment = await Shipment.findOne({ tracking_id: vessel._id });
                        // console.log(`\nVessel ID: ${vessel._id}`);
                        // console.log(`Vessel Location (lat, lon): ${vessel.lat_lon}`);
                        // console.log(`Distance from Incident: ${distance.toFixed(2)} km`);
                        if(distance <= 15){
                            await this.handleSeaDelay(incident, vessel, shipment);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error in processUnupdatedDelaySea:', error);
            throw error;
        }
    }


    /**
     * Process unupdated delay incidents
     * @returns {Promise<Object>} Processing results
     */
    async processUnupdatedDelayIncidents() {
        try {
            await this.processUnupdatedDelayPort();
            await this.processUnupdatedDelaySea();
        
    //         // Get all incidents where delay_updated is false
    //         const unupdatedIncidents = await Incident.find({ delay_updated: false })
    //             .populate('source_news')
    //             .populate('affected_ports');

    //         const results = {
    //             processed: 0,
    //             skipped: 0,
    //             errors: 0,
    //             details: [],
    //             delayNotifications: [] // New array to store delay notifications
    //         };

    //         // Create a map to store notifications by user and shipment
    //         const notificationMap = new Map();

    //         for (const incident of unupdatedIncidents) {
    //             try {
    //                 if (incident.location_type === 'sea') {
    //                     // Find vessels that are in transit
    //                     const vesselsInTransit = await VesselTracking.find({
    //                         status: 'intransit'
    //                     });

    //                     for (const vessel of vesselsInTransit) {
    //                         // Get shipment ID from Shipment model using tracking ID
    //                         const shipment = await Shipment.findOne({ tracking_id: vessel._id }).populate('client_id');
    //                         if (!shipment) {
    //                             console.log(`No shipment found for vessel tracking ID: ${vessel._id}`);
    //                             continue;
    //                         }

    //                         // Calculate distance between vessel and incident location
    //                         const distance = this.calculateDistance(
    //                             vessel.lat_lon[0],
    //                             vessel.lat_lon[1],
    //                             incident.lat_lon[0],
    //                             incident.lat_lon[1]
    //                         );

    //                         // If vessel is within 15km of incident
    //                         if (distance <= 15) {
    //                             const delay = await this.calculateDelay(incident, vessel);
    //                             if (delay > 0) {
    //                                 // Create or update delay record
    //                                 const updatedDelay = await Delay.findOneAndUpdate(
    //                                     {
    //                                         shipment: shipment._id,
    //                                         location_type: 'sea'
    //                                     },
    //                                     {
    //                                         $push: {
    //                                             sea_delays: {
    //                                                 incident: incident._id,
    //                                                 delay_days: delay
    //                                             }
    //                                         }
    //                                     },
    //                                     { upsert: true, new: true }
    //                                 );
                                    
    //                                 if (updatedDelay) {
    //                                     console.log("this is from delay service");
    //                                     console.log(shipment);
    //                                     console.log(shipment.client_id.name);
    //                                     console.log(shipment.client_id.email);
    //                                     // console.log(shipment.client_id);
    //                                     const key = `${shipment.client_id._id}-${shipment._id}`;
    //                                     console.log(key);
    //                                     if (!notificationMap.has(key)) {
    //                                         notificationMap.set(key, {
    //                                             userName: shipment.client_id.name,
    //                                             userEmail: shipment.client_id.email,
    //                                             shipmentId: shipment._id,
    //                                             delayType: 'sea',
    //                                             seaIssues: [],
    //                                             affectedPorts: [],
    //                                             totalDelay: 0
    //                                         });
    //                                     }
    //                                     const notification = notificationMap.get(key);
    //                                     notification.seaIssues.push({
    //                                         incidentId: incident._id,
    //                                         delayDays: delay,
    //                                         reason: incident.source_news.title,
    //                                         startDate: incident.createdAt
    //                                     });
    //                                     notification.totalDelay += delay;
    //                                 }
    //                             }
    //                         }
    //                     }

    //                     // Mark incident as processed
    //                     await Incident.findByIdAndUpdate(incident._id, { delay_updated: true });

    //                     results.details.push({
    //                         incidentId: incident._id,
    //                         type: 'sea',
    //                         status: 'processed',
    //                         message: 'Successfully processed sea incident'
    //                     });
    //                     results.processed++;
    //                     continue;
    //                 }

    //                 // Process port incidents
    //                 const affectedPorts = incident.affected_ports;
    //                 for (const port of affectedPorts) {
    //                     // Find vessels that have this port in their events but no actual arrival time
    //                     const vessels = await VesselTracking.find({
    //                         'events': {
    //                             $elemMatch: {
    //                                 'port_code': port.port_code,
    //                                 'actual_time_of_arrival': { $exists: false }
    //                             }
    //                         }
    //                     });

    //                     for (const vessel of vessels) {
    //                         // Get shipment and user information
    //                         const shipment = await Shipment.findOne({ tracking_id: vessel._id })
    //                             .populate('client_id');
                            
    //                         if (!shipment) {
    //                             console.log(`No shipment found for vessel tracking ID: ${vessel._id}`);
    //                             continue;
    //                         }

    //                         const delay = await this.calculateDelay(incident, vessel);
    //                         if (delay > 0) {
    //                             // Create or update delay record
    //                             const updatedDelay = await Delay.findOneAndUpdate(
    //                                 {
    //                                     shipment: shipment._id,
    //                                     location_type: 'port'
    //                                 },
    //                                 {
    //                                     $push: {
    //                                         affected_ports: {
    //                                             port: port._id,
    //                                             incident: incident._id,
    //                                             delay_days: delay
    //                                         }
    //                                     }
    //                                 },
    //                                 { upsert: true, new: true }
    //                             );
    //                             console.log("updatedDelay", updatedDelay);
                                
    //                             if (updatedDelay) {
    //                                 const key = `${shipment.client_id._id}-${shipment._id}`;
    //                                 if (!notificationMap.has(key)) {
    //                                     notificationMap.set(key, {
    //                                         userName: shipment.client_id.name,
    //                                         userEmail: shipment.client_id.email,
    //                                         shipmentId: shipment._id,
    //                                         delayType: 'port',
    //                                         seaIssues: [],
    //                                         affectedPorts: [],
    //                                         totalDelay: 0
    //                                     });
    //                                 }
    //                                 const notification = notificationMap.get(key);
    //                                 notification.affectedPorts.push({
    //                                     portCode: port.port_code,
    //                                     portName: port.port_name,
    //                                     delayDays: delay,
    //                                     reason: incident.source_news.title,
    //                                     startDate: incident.createdAt
    //                                 });
    //                                 notification.totalDelay += delay;
    //                             }
    //                         }
    //                     }
    //                 }

    //                 // Mark incident as processed
    //                 await Incident.findByIdAndUpdate(incident._id, { delay_updated: true });
                    
    //                 results.details.push({
    //                     incidentId: incident._id,
    //                     type: 'port',
    //                     status: 'processed',
    //                     message: 'Successfully processed port incident'
    //                 });
    //                 results.processed++;
    //             } catch (error) {
    //                 console.error(`Error processing incident ${incident._id}:`, error);
    //                 results.details.push({
    //                     incidentId: incident._id,
    //                     type: incident.location_type,
    //                     status: 'error',
    //                     message: error.message
    //                 });
    //                 results.errors++;
    //             }
    //         }

    //         // Convert map to array and add to results
    //         results.delayNotifications = Array.from(notificationMap.values());
    //         notificationHandler.processNotifications(results.delayNotifications);

    //         // Return the results without sending emails
    //         return results;
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

    /**
     * Send email notifications for processed delays
     * @param {Array} notifications - Array of delay notifications
     * @returns {Promise<Object>} Email sending results
     */
    async sendDelayEmailNotifications(notifications) {
        const emailResults = {
            sent: 0,
            failed: 0,
            errors: []
        };

        for (const notification of notifications) {
            try {
                const emailResult = await emailService.sendDelayNotification({
                    to: notification.userEmail,
                    userName: notification.userName,
                    shipmentId: notification.shipmentId,
                    delayType: notification.delayType,
                    seaIssues: notification.seaIssues,
                    affectedPorts: notification.affectedPorts,
                    totalDelay: notification.totalDelay
                });

                if (emailResult.success) {
                    emailResults.sent++;
                } else {
                    emailResults.failed++;
                    emailResults.errors.push({
                        shipmentId: notification.shipmentId,
                        error: emailResult.message
                    });
                }
            } catch (error) {
                emailResults.failed++;
                emailResults.errors.push({
                    shipmentId: notification.shipmentId,
                    error: error.message
                });
            }
        }

        return emailResults;
    }
}

module.exports = new DelayService(); 