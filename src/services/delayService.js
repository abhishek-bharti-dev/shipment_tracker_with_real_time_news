const mongoose = require('mongoose');
const Delay = require('../models/Delay');
const VesselTracking = require('../models/VesselTracking');
const Port = require('../models/Port');
const Incident = require('../models/Incident');
const User = require('../models/User');
const Shipment = require('../models/Shipment');
const emailService = require('./emailService');
const notificationHandler = require('../handlers/notificationHandler');

// Define the GocometShipload model outside the function
const GocometShipload = mongoose.model('gocomet_shiploads', new mongoose.Schema({
  id: String,
  status: Number,
  events: {
    type: Map,
    of: {
      port: {
        id: String,
        name: String,
        port_code: String
      },
      planned_date: Date,
      actual_date: Date,
      mode: Number,
      original_planned_date: Date
    }
  }
}));
const gocomet_vessel_trackings = require('../models/gocomet_vessel_trackings');

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
            const processedIncidents = new Set(); // Track processed incident IDs

            for (const delay of delays) {
                if (delay.location_type === 'port') {
                    // Sum up delay days from all affected ports, considering unique incidents
                    for (const port of delay.affected_ports) {
                        for (const incidentId of port.incidents) {
                            if (!processedIncidents.has(incidentId.toString())) {
                                totalDelay += port.delay_days;
                                processedIncidents.add(incidentId.toString());
                            }
                        }
                    }
                } else {
                    // Sum up delay days from all sea delays, considering unique incidents
                    for (const sea of delay.sea_delays) {
                        for (const incidentId of sea.incidents) {
                            if (!processedIncidents.has(incidentId.toString())) {
                                totalDelay += sea.delay_days;
                                processedIncidents.add(incidentId.toString());
                            }
                        }
                    }
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
                const startDate = new Date(inc.createdAt);
                const endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + inc.estimated_duration_days);
                
                return {
                    start: startDate,
                    end: endDate > today ? today : endDate,
                    delay: inc.estimated_duration_days,
                    severity: inc.severity || 1
                };
            });

            // Add the current incident
            const currentStartDate = new Date(incident.createdAt);
            const currentEndDate = new Date(currentStartDate);
            currentEndDate.setDate(currentStartDate.getDate() + incident.estimated_duration_days);
            
            intervals.push({
                start: currentStartDate,
                end: currentEndDate > today ? today : currentEndDate,
                delay: incident.estimated_duration_days,
                severity: incident.severity || 1
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
                    // Take the maximum delay considering severity
                    const currentDelay = currentInterval.delay * currentInterval.severity;
                    const newDelay = intervals[i].delay * intervals[i].severity;
                    currentInterval.delay = Math.max(currentDelay, newDelay) / currentInterval.severity;
                } else {
                    mergedIntervals.push(currentInterval);
                    currentInterval = intervals[i];
                }
            }
            mergedIntervals.push(currentInterval);

            // Calculate total delay
            let totalDelay = 0;
            for (const interval of mergedIntervals) {
                const days = Math.ceil((interval.end - interval.start) / (1000 * 60 * 60 * 24));
                totalDelay = Math.max(totalDelay, days * interval.severity);
            }

            return totalDelay;
        } catch (error) {
            console.error('Error in calculateOverlappingDelay:', error);
            throw error;
        }
    }

    async calculateShiploadDelay(incidentId, shiploadId, portId) {
        try {
            // Get incident details
            const incident = await Incident.findById(incidentId);
            if (!incident) {
                console.log(`No incident found with ID: ${incidentId}`);
                return null;
            }

            // Get shipload details using id field instead of _id
            const shipload = await GocometShipload.findOne({ id: shiploadId });
            if (!shipload) {
                console.log(`No shipload found with ID: ${shiploadId}`);
                return null;
            }

            // Convert events Map to array and find matching port event
            const eventsArray = Array.from(shipload.events.entries());
            const portEvent = eventsArray.find(([_, event]) => event.port.id === portId);

            if (!portEvent) {
                console.log(`No event found for port ID: ${portId} in shipload: ${shiploadId}`);
                return null;
            }

            const [_, event] = portEvent;

            // Get port code from the event
            const portCode = event.port.port_code;

            // Calculate overlapping delay for all incidents affecting this port
            const totalDelay = await this.calculateOverlappingDelay(incident, shipload, portCode);

            // Calculate expected date based on planned date and total delay
            const expectedDate = new Date(event.planned_date);
            expectedDate.setDate(expectedDate.getDate() + totalDelay);

            // Find or create delay record
            let delayRecord = await Delay.findOne({ 
                shipment: shiploadId,
                'affected_ports.port_code': portCode 
            });

            if (!delayRecord) {
                // Create new delay record
                delayRecord = new Delay({
                    shipment: shiploadId,
                    location_type: 'port',
                    affected_ports: [{
                        port_code: portCode,
                        delay_days: totalDelay,
                        incidents: [incidentId],
                        updatedAt: new Date()
                    }]
                });
            } else {
                // Update existing delay record
                const portDelay = delayRecord.affected_ports.find(p => p.port_code === portCode);
                if (portDelay) {
                    // Update existing port delay
                    portDelay.delay_days = totalDelay;
                    if (!portDelay.incidents.includes(incidentId)) {
                        portDelay.incidents.push(incidentId);
                    }
                    portDelay.updatedAt = new Date();
                } else {
                    // Add new port delay
                    delayRecord.affected_ports.push({
                        port_code: portCode,
                        delay_days: totalDelay,
                        incidents: [incidentId],
                        updatedAt: new Date()
                    });
                }
            }

            // Save the delay record
            await delayRecord.save();

            // Update incident's delay_updated flag and increment total_shipments_affected
            await Incident.findByIdAndUpdate(incidentId, {
                $set: { delay_updated: true },
                $inc: { total_shipments_affected: 1 }
            });

            return {
                shiploadId,
                portId,
                originalPlannedDate: event.planned_date,
                expectedDate,
                delayDays: totalDelay,
                severity: incident.severity,
                estimatedDuration: incident.estimated_duration_days,
                mode: event.mode
            };
        } catch (error) {
            console.error('Error in calculateShiploadDelay:', error);
            return null;
        }
    }

    async processUnupdatedDelayPort() {
        try {
            console.log('\n=== Processing Unupdated Delay Ports ===');
            console.log('----------------------------------------');
            
            // 1. Get all incidents where delay_updated is false
            const incidents = await Incident.find({ delay_updated: false });
            console.log(`Total incidents with delay_updated=false: ${incidents.length}`);
            
            // 2. Get all affected ports from these incidents
            const affectedPortIds = new Set();
            const portIncidentMap = new Map(); // Map to track unique port-incident combinations
            
            incidents.forEach(incident => {
                if (incident.affected_ports && incident.affected_ports.length > 0) {
                    incident.affected_ports.forEach(port => {
                        affectedPortIds.add(port.toString());
                        // Track unique port-incident combinations
                        const portId = port.toString();
                        if (!portIncidentMap.has(portId)) {
                            portIncidentMap.set(portId, new Set());
                        }
                        portIncidentMap.get(portId).add(incident._id.toString());
                    });
                }
            });
            
            console.log(`Total unique affected ports: ${affectedPortIds.size}`);
            
            // 3. Get port details from our port collection
            const ports = await Port.find({ 
                _id: { $in: Array.from(affectedPortIds) }
            }, { 
                _id: 1, 
                port_code: 1, 
                port_name: 1 
            });
            
            console.log(`\n=== Processing Ports and Shiploads ===`);
            console.log('----------------------------------------');
            
            // 4. Get GocometPort model with correct schema
            const GocometPort = mongoose.model('gocomet_ports', new mongoose.Schema({
                id: String,
                code: String,
                name: String,
                display_name: String
            }, { 
                collection: 'gocomet_ports'
            }));
            
            let totalMatchingShiploads = 0;
            let totalDelaysUpdated = 0;
            let printedCount = 0;
            
            // 5. For each port, find matching gocomet port and then find matching shiploads
            for (const port of ports) {
                const gocometPort = await GocometPort.findOne({ 
                    code: port.port_code 
                });
                
                if (gocometPort) {
                    console.log(`\nProcessing Port: ${port.port_code} (${port.port_name})`);
                    
                    // Find matching shiploads using aggregation pipeline
                    const matchingShiploads = await GocometShipload.aggregate([
                        // Match shiploads with status 2
                        { $match: { status: 2 } },
                        
                        // Convert events object to array
                        { $project: {
                            id: 1,
                            eventArray: { $objectToArray: '$events' }
                        }},
                        
                        // Unwind the events array
                        { $unwind: '$eventArray' },
                        
                        // Match events with mode 1 and actual_date null
                        { $match: {
                            'eventArray.v.mode': 1,
                            'eventArray.v.actual_date': null,
                            'eventArray.v.port.id': gocometPort.id
                        }},
                        
                        // Group by shipload ID to get unique shiploads
                        { $group: {
                            _id: '$id',
                            count: { $sum: 1 },
                            events: { $push: '$eventArray.v' }
                        }}
                    ]);
                    
                    console.log(`Found ${matchingShiploads.length} matching shiploads`);
                    
                    // Process each shipload
                    for (const shipload of matchingShiploads) {
                        const event = shipload.events.find(e => e.port.id === gocometPort.id);
                        if (event && event.planned_date) {
                            const plannedDate = new Date(event.planned_date);
                            const currentDate = new Date();
                            const daysUntilPlanned = Math.ceil((plannedDate - currentDate) / (1000 * 60 * 60 * 24));
                            
                            // Calculate delay for each incident affecting this port
                            let totalDelay = 0;
                            let estimatedDelay = 0;
                            const processedIncidents = new Set();
                            
                            for (const incident of incidents) {
                                if (incident.affected_ports.some(p => p.toString() === port._id.toString())) {
                                    if (processedIncidents.has(incident._id.toString())) {
                                        continue;
                                    }
                                    
                                    const delay = Math.max(0, incident.estimated_duration_days - daysUntilPlanned);
                                    if (delay > 0) {
                                        totalDelay = Math.max(totalDelay, delay);
                                        estimatedDelay = incident.estimated_duration_days;
                                        processedIncidents.add(incident._id.toString());
                                    }
                                }
                            }
                            
                            // Only update if there's a positive delay
                            if (totalDelay > 0) {
                                // Find or create delay record
                                let delayRecord = await Delay.findOne({ 
                                    shipment: shipload._id,
                                    'affected_ports.port_code': port.port_code 
                                });
                                
                                if (!delayRecord) {
                                    delayRecord = new Delay({
                                        shipment: shipload._id,
                                        location_type: 'port',
                                        affected_ports: [{
                                            port_code: port.port_code,
                                            delay_days: totalDelay,
                                            incidents: Array.from(processedIncidents),
                                            updatedAt: new Date()
                                        }]
                                    });
                                } else {
                                    const portDelay = delayRecord.affected_ports.find(p => p.port_code === port.port_code);
                                    if (portDelay) {
                                        portDelay.delay_days = totalDelay;
                                        portDelay.incidents = Array.from(new Set([...portDelay.incidents, ...processedIncidents]));
                                        portDelay.updatedAt = new Date();
                                    } else {
                                        delayRecord.affected_ports.push({
                                            port_code: port.port_code,
                                            delay_days: totalDelay,
                                            incidents: Array.from(processedIncidents),
                                            updatedAt: new Date()
                                        });
                                    }
                                }
                                
                                // Save the delay record
                                await delayRecord.save();
                                
                                // Update incident's delay_updated flag and increment total_shipments_affected
                                for (const incidentId of processedIncidents) {
                                    await Incident.findByIdAndUpdate(incidentId, {
                                        $set: { delay_updated: true },
                                        $inc: { total_shipments_affected: 1 }
                                    });
                                }
                                
                                totalDelaysUpdated++;
                                
                                // Only print first 5 updates
                                if (printedCount < 5) {
                                    console.log(`\nUpdate ${printedCount + 1}:`);
                                    console.log(`Shipload ID: ${shipload._id}`);
                                    console.log(`Port: ${port.port_code} (${port.port_name})`);
                                    console.log(`Planned Date: ${plannedDate.toLocaleDateString()}`);
                                    console.log(`Estimated Delay: ${estimatedDelay} days`);
                                    console.log(`Calculated Delay: ${totalDelay} days`);
                                    console.log(`Affected Incidents: ${processedIncidents.size}`);
                                    console.log('----------------------------------------');
                                    printedCount++;
                                }
                            }
                        }
                    }
                    
                    totalMatchingShiploads += matchingShiploads.length;
                }
            }
            
            console.log('\n=== Summary ===');
            console.log('----------------------------------------');
            console.log(`Total incidents processed: ${incidents.length}`);
            console.log(`Total unique affected ports: ${affectedPortIds.size}`);
            console.log(`Total matching shiploads: ${totalMatchingShiploads}`);
            console.log(`Total delays updated: ${totalDelaysUpdated}`);
            
            return {
                success: true,
                message: 'Port delay processing completed',
                stats: {
                    incidentsProcessed: incidents.length,
                    uniquePorts: affectedPortIds.size,
                    matchingShiploads: totalMatchingShiploads,
                    delaysUpdated: totalDelaysUpdated
                }
            };
            
        } catch (error) {
            console.error('Error in processUnupdatedDelayPort:', error);
            throw error;
        }
    }

    async calculateSeaDelay(incident) {
        try {
            const delayDays = incident.estimated_duration_days;
            const startDate = new Date(incident.start_time);
            const currentDate = new Date();

            const expectedEndDate = new Date(startDate);
            expectedEndDate.setDate(startDate.getDate() + delayDays);

            const timeDiff = expectedEndDate - currentDate;
            const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            return daysRemaining > 0 ? daysRemaining : 0; // Avoid negative values
        } catch (error) {
            console.error('Error in calculateSeaDelay:', error);
            throw error;    
        }
    }

    async handleSeaDelay(incident, shipment_id) {
        try {
            // console.log("incident_id", incident._id);
            // console.log("shipment_id", shipment._id);
            // console.log("incident:- ",incident);
            // console.log("shipment:- ",shipment_id);
            // Find existing delay record for this shipment
            let delayRecord = await Delay.findOne({shipment: shipment_id});
            // console.log(delayRecord);
            if(!delayRecord){
                delayRecord = new Delay({
                    shipment: shipment_id,
                    location_type: 'sea',
                    sea_delays: []
                });
            }
            const delayDays = await this.calculateSeaDelay(incident);
            // console.log("incident duration ",incident.estimated_duration_days);
            // console.log("start date ",incident.start_time);
            // console.log("delayDays",delayDays);
            
            if (delayDays>0) {
                // If port exists, update the delay and add the incident
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
            console.log("processUnupdatedDelaySea");
            const incidents = await Incident.find({ delay_updated: false })
            
            const seaIncidents = incidents.filter(incident => incident.location_type === 'sea');
            console.log("total un-updated sea incidents:- ",seaIncidents.length);
            
            for (const incident of seaIncidents) {
                // const lat = incident.lat_lon[0];
                // const lon = incident.lat_lon[1];
                const lat = 35.05833;
                const lon = 128.9978;
                
                // Find vessels within 15km range using geospatial query
                const vesselsInTransit = await gocomet_vessel_trackings.find({
                    location: {
                        $near: {
                            $geometry: {
                                type: "Point",
                                coordinates: [lon, lat] // Note: MongoDB expects [longitude, latitude]
                            },
                            $maxDistance: 15000 // 15km in meters
                        }
                    }
                });
                // const vesselsInTransit = await gocomet_vessel_trackings.find({});
                // console.log(vesselsInTransit)
                console.log(`Found ${vesselsInTransit.length} vessels within 15km of incident`);
                for (const vessel of vesselsInTransit) {
                    // console.log(vessel)
                    // console.log(vessel.shipload_ids);
                    for(const shipload_id of vessel.shipload_ids){
                    //     console.log(shipload_id);
                        await this.handleSeaDelay(incident,shipload_id);
                    //     // console.log("shipload ka id")
                    //     // console.log(shipload_id);
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
            // await this.processUnupdatedDelaySea();
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