const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const Port = require('../models/Port');
const VesselTracking = require('../models/VesselTracking');
const Shipment = require('../models/Shipment');
const incident_id = "67eeece0501f721c7f28136e";

/**
 * Connects to MongoDB
 * @returns {Promise<void>}
 */
async function connectToMongoDB() {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect("mongodb+srv://abhishek:1234@cluster0.xyyvvsu.mongodb.net/shipment_tracker?retryWrites=true&w=majority&appName=Cluster0");
    console.log('Successfully connected to MongoDB');
  } catch (connectionError) {
    console.error('Failed to connect to MongoDB:', connectionError.message);
    throw connectionError;
  }
}

/**
 * Closes MongoDB connection
 * @returns {Promise<void>}
 */
async function closeMongoDBConnection() {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  } catch (closeError) {
    console.error('Error closing MongoDB connection:', closeError.message);
    throw closeError;
  }
}

/**
 * Gets incident by ID
 * @param {string} incidentId 
 * @returns {Promise<Object>}
 */
async function getIncident(incidentId) {
  const incident = await Incident.findOne({ _id: incidentId });
  if (!incident) {
    throw new Error(`No incident found with ID: ${incidentId}`);
  }
  return incident;
}

/**
 * Gets port details by ID
 * @param {string} portId 
 * @returns {Promise<Object>}
 */
async function getPortDetails(portId) {
  const port = await Port.findOne({ _id: portId });
  if (!port) {
    throw new Error(`Port details not found for ID: ${portId}`);
  }
  return port;
}

/**
 * Gets vessels with events at a specific port
 * @param {string} portCode 
 * @returns {Promise<Array>}
 */
async function getVesselsAtPort(portCode) {
  return await VesselTracking.find({
    'events.port_code': portCode
  });
}

/**
 * Gets shipments for a specific vessel
 * @param {string} vesselId 
 * @returns {Promise<Array>}
 */
async function getShipmentsForVessel(vesselId) {
  return await Shipment.find({
    tracking_id: vesselId
  });
}

/**
 * Gets all incidents affecting a specific port
 * @param {string} portId 
 * @returns {Promise<Array>}
 */
async function getIncidentsForPort(portId) {
  return await Incident.find({
    'affected_ports': portId,
    'estimated_duration_days': { $exists: true, $gt: 0 }
  });
}

/**
 * Main function to get affected port IDs and display related information
 * @returns {Promise<void>}
 */
async function getAffectedPortIds() {
  try {
    await connectToMongoDB();
    
    const incident = await getIncident(incident_id);
    
    if (!incident.affected_ports || incident.affected_ports.length === 0) {
      console.log('No affected port IDs found for this incident');
      return;
    }
    
    console.log('\n=== Affected Ports ===');
    for (const portId of incident.affected_ports) {
      const port = await getPortDetails(portId);
      console.log(`\nPort: ${port.port_name} (${port.port_code})`);
      
      // Get vessels at this port
      const vessels = await getVesselsAtPort(port.port_code);
      if (vessels.length > 0) {
        console.log('  Affected Vessels:');
        for (const vessel of vessels) {
          // Get incidents affecting this port
          const incidents = await getIncidentsForPort(port._id);
          const totalDelay = incidents.reduce((sum, incident) => {
            return sum + (incident.estimated_duration_days || 0);
          }, 0);
          
          console.log(`    Vessel: ${vessel.vessel_name} (${vessel.vessel_code})`);
          console.log(`      Estimated Delay: ${totalDelay} days`);
          
          // Get shipments for this vessel
          const shipments = await getShipmentsForVessel(vessel._id);
          if (shipments.length > 0) {
            console.log('      Affected Shipments:');
            shipments.forEach((shipment, index) => {
              console.log(`        ${index + 1}. Shipment ID: ${shipment.shipment_id}`);
              console.log(`           Cargo Type: ${shipment.cargo_type}`);
              console.log(`           POL: ${shipment.POL}`);
              console.log(`           POD: ${shipment.POD}`);
            });
          }
        }
      } else {
        console.log('  No vessels found at this port');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await closeMongoDBConnection();
  }
}

// Execute the function
getAffectedPortIds();

module.exports = {
  getAffectedPortIds,
  connectToMongoDB,
  closeMongoDBConnection,
  getIncident,
  getPortDetails,
  getVesselsAtPort,
  getShipmentsForVessel,
  getIncidentsForPort
};