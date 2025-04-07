const mongoose = require('mongoose');
const { handleNewIncident } = require('../src/services/delayService');

async function testIncidentHandling() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect("mongodb+srv://abhishek:1234@cluster0.xyyvvsu.mongodb.net/shipment_tracker?retryWrites=true&w=majority&appName=Cluster0");
    console.log('Connected to MongoDB');

    // Test with an incident ID
    const incidentId = '67eeece1501f721c7f281382'; // Replace with actual incident ID
    
    console.log('\nHandling new incident...');
    await handleNewIncident(incidentId);
    console.log('Incident handling completed');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
}

testIncidentHandling(); 