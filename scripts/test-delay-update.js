const mongoose = require('mongoose');
const { updateShipmentDelay, getShipmentDelays } = require('../src/services/delayService');

async function testDelayUpdate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect("mongodb+srv://abhishek:1234@cluster0.xyyvvsu.mongodb.net/shipment_tracker?retryWrites=true&w=majority&appName=Cluster0");
    console.log('Connected to MongoDB');

    // Example data
    const testData = {
      shipmentId: '67eeece1501f721c7f281382', // Replace with actual shipment ID
      incidentId: '67eeece1501f721c7f281382', // Replace with actual incident ID
      affectedPorts: [
        '67eeece1501f721c7f281374', // Los Angeles Port
        '67eeece1501f721c7f281377'  // New York Port
      ],
      notes: 'Test delay update'
    };

    console.log('\nUpdating shipment delay...');
    const delay = await updateShipmentDelay(testData);
    console.log('Delay updated successfully:', {
      id: delay._id,
      shipment: delay.shipment,
      total_delay_days: delay.total_delay_days,
      affected_ports: delay.affected_ports.map(p => ({
        port_name: p.port_name,
        delay_days: p.delay_days
      }))
    });

    console.log('\nGetting all delays for shipment...');
    const delays = await getShipmentDelays(testData.shipmentId);
    console.log('Found delays:', delays.map(d => ({
      id: d._id,
      total_delay_days: d.total_delay_days,
      status: d.status
    })));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
}

testDelayUpdate(); 