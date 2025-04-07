const mongoose = require('mongoose');
const { updateShipmentDelay } = require('../src/services/delayService');

const trackingIds = [
  '67eeece1501f721c7f281374',
  '67eeece1501f721c7f281377',
  '67eeece1501f721c7f28137a',
  '67eeece1501f721c7f28137d',
  '67eeece1501f721c7f281380'
];

const portIds = [
  '67eeece1501f721c7f28136f', // Port 1
  '67eeece1501f721c7f281370', // Port 2
  '67eeece1501f721c7f281371', // Port 3
  '67eeece1501f721c7f281372', // Port 4
  '67eeece1501f721c7f281373'  // Port 5
];

const incidentIds = [
  '67eeece0501f721c7f28136e', // Incident 1
  '67eeece1501f721c7f281382'  // Incident 2
];

async function createMultiplePortDelays() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect("mongodb+srv://abhishek:1234@cluster0.xyyvvsu.mongodb.net/shipment_tracker?retryWrites=true&w=majority&appName=Cluster0");
    console.log('Connected to MongoDB');

    // Create delays for each tracking ID
    for (const trackingId of trackingIds) {
      console.log(`\nProcessing tracking ID: ${trackingId}`);
      
      // Create delays with multiple ports for each incident
      for (const incidentId of incidentIds) {
        // Select 2-3 random ports for each delay
        const selectedPorts = portIds
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.floor(Math.random() * 2) + 2); // Randomly select 2-3 ports

        console.log(`Creating delay for incident ${incidentId} with ports:`, selectedPorts);

        try {
          await updateShipmentDelay({
            shipmentId: trackingId,
            incidentId: incidentId,
            affectedPorts: selectedPorts,
            notes: `Multiple port delay for tracking ID ${trackingId}`
          });
          console.log('✓ Delay created successfully');
        } catch (error) {
          console.error('✗ Error creating delay:', error.message);
        }
      }
    }

    console.log('\nAll delays created successfully');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
}

createMultiplePortDelays(); 