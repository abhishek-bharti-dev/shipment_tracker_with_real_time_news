const mongoose = require('mongoose');
const Delay = require('../models/Delay');
const VesselTracking = require('../models/VesselTracking');
const Port = require('../models/Port');
const Incident = require('../models/Incident');

/**
 * Updates or creates a delay record for a shipment
 * @param {Object} params
 * @param {string} params.shipmentId - The ID of the affected vessel
 * @param {string} params.incidentId - The ID of the incident causing the delay
 * @param {Array} params.affectedPorts - Array of port IDs causing the delay
 * @param {string} [params.notes] - Optional notes about the delay
 * @returns {Promise<Object>} The created/updated delay record
 */
async function updateShipmentDelay({ shipmentId, incidentId, affectedPorts, notes = '' }) {
  try {
    // Get vessel details
    const vessel = await VesselTracking.findById(shipmentId);
    if (!vessel) {
      throw new Error(`Vessel not found with ID: ${shipmentId}`);
    }

    // Get incident details
    const incident = await Incident.findById(incidentId);
    if (!incident) {
      throw new Error(`Incident not found with ID: ${incidentId}`);
    }

    // Get port details for all affected ports
    const ports = await Port.find({ _id: { $in: affectedPorts } });
    if (ports.length !== affectedPorts.length) {
      throw new Error('One or more ports not found');
    }

    // Calculate total delay days from the incident
    const totalDelayDays = incident.estimated_duration_days || 0;

    // Prepare affected ports data
    const affectedPortsData = ports.map(port => ({
      port: port._id,
      delay_days: totalDelayDays,
      port_name: port.port_name,
      port_code: port.port_code,
      incident: incidentId // Add incident reference to each port
    }));

    // Check if delay record already exists for this vessel and incident
    let delay = await Delay.findOne({
      shipment: shipmentId,
      'affected_ports.incident': incidentId
    });

    if (delay) {
      // Update existing delay record
      delay.affected_ports = affectedPortsData;
      await delay.save();
      console.log('Updated existing delay record');
    } else {
      // Create new delay record
      delay = await Delay.create({
        shipment: shipmentId,
        affected_ports: affectedPortsData
      });
      console.log('Created new delay record');
    }

    return delay;
  } catch (error) {
    console.error('Error updating shipment delay:', error);
    throw error;
  }
}

/**
 * Gets all delays for a specific shipment
 * @param {string} shipmentId - The ID of the shipment
 * @returns {Promise<Array>} Array of delay records
 */
async function getShipmentDelays(shipmentId) {
  try {
    return await Delay.find({ shipment: shipmentId })
      .populate('affected_ports.port')
      .populate('incident')
      .sort({ createdAt: -1 });
  } catch (error) {
    console.error('Error getting shipment delays:', error);
    throw error;
  }
}

/**
 * Updates the status of a delay
 * @param {string} delayId - The ID of the delay record
 * @param {string} status - New status (pending, in_progress, resolved)
 * @returns {Promise<Object>} Updated delay record
 */
async function updateDelayStatus(delayId, status) {
  try {
    const delay = await Delay.findById(delayId);
    if (!delay) {
      throw new Error(`Delay not found with ID: ${delayId}`);
    }

    delay.status = status;
    await delay.save();
    return delay;
  } catch (error) {
    console.error('Error updating delay status:', error);
    throw error;
  }
}

/**
 * Handles new incident creation and updates delays for affected shipments
 * @param {string} incidentId - The ID of the new incident
 * @returns {Promise<void>}
 */
async function handleNewIncident(incidentId) {
  try {
    // Get the incident details
    const incident = await Incident.findById(incidentId);
    if (!incident) {
      throw new Error(`Incident not found with ID: ${incidentId}`);
    }

    // Get all affected ports
    const affectedPorts = incident.affected_ports;
    if (!affectedPorts || affectedPorts.length === 0) {
      console.log('No affected ports found for this incident');
      return;
    }

    // Get all vessels that are currently at these ports
    const portCodes = await Port.find({ _id: { $in: affectedPorts } })
      .select('port_code')
      .then(ports => ports.map(p => p.port_code));

    const affectedVessels = await VesselTracking.find({
      'events.port_code': { $in: portCodes },
      'events.event_type': 'arrival' // Only consider vessels that have arrived
    });

    console.log(`Found ${affectedVessels.length} affected vessels`);

    // Create/update delay records for each affected vessel
    for (const vessel of affectedVessels) {
      await updateShipmentDelay({
        shipmentId: vessel._id,
        incidentId: incident._id,
        affectedPorts: affectedPorts,
        notes: `Delay caused by incident: ${incident.source_news}`
      });
    }

    console.log('Successfully updated delays for all affected vessels');
  } catch (error) {
    console.error('Error handling new incident:', error);
    throw error;
  }
}

module.exports = {
  updateShipmentDelay,
  getShipmentDelays,
  updateDelayStatus,
  handleNewIncident
}; 