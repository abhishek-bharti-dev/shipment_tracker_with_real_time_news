const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const incident_id = "32ad5079fd9774d7b9fe4cb3f9234c47";


/**
 * Gets affected port IDs for a specific incident and consoles them
 */
async function getAffectedPortIds() {
  try {
    // Connect to MongoDB with a separate try-catch for connection issues
    try {
      console.log('Attempting to connect to MongoDB...');
      await mongoose.connect("mongodb+srv://abhishek:1234@cluster0.xyyvvsu.mongodb.net/shipment_tracker?retryWrites=true&w=majority&appName=Cluster0");
      console.log('Successfully connected to MongoDB');
    } catch (connectionError) {
      console.error('Failed to connect to MongoDB:', connectionError.message);
      return; // Exit the function if connection fails
    }
    
    // Find the incident by incident_id
    const incident = await Incident.findOne({ incident_id });
    
    if (!incident) {
      console.log('No incident found with ID:', incident_id);
      return;
    }
    
    // Check if the incident has affected port IDs
    if (!incident.affected_port_ids || incident.affected_port_ids.length === 0) {
      console.log('No affected port IDs found for this incident');
      return;
    }
    
    // Console the affected port IDs
    console.log('Affected Port IDs:');
    incident.affected_port_ids.forEach((id, index) => {
      console.log(`${index + 1}. ${id}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Close the connection
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
      }
    } catch (closeError) {
      console.error('Error closing MongoDB connection:', closeError.message);
    }
  }
}

// Execute the function
getAffectedPortIds();

module.exports = {
  getAffectedPortIds
};