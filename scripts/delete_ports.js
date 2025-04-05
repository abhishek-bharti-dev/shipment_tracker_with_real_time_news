const mongoose = require('mongoose');
const Port = require('../src/models/Port');

const portCodes = ['USLAX', 'USNYC', 'DEHAM', 'NLRTM', 'AESYD'];
const portIds = [
  '67eeece1501f721c7f281374',
  '67eeece1501f721c7f281377',
  '67eeece1501f721c7f28137a',
  '67eeece1501f721c7f28137d',
  '67eeece1501f721c7f281380'
];

async function deletePorts() {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect("mongodb+srv://abhishek:1234@cluster0.xyyvvsu.mongodb.net/shipment_tracker?retryWrites=true&w=majority&appName=Cluster0");
    console.log('Successfully connected to MongoDB');

    // Delete all ports with matching IDs or port codes
    try {
      const result = await Port.deleteMany({
        $or: [
          { _id: { $in: portIds } },
          { port_code: { $in: portCodes } }
        ]
      });
      console.log(`Successfully deleted ${result.deletedCount} ports`);
    } catch (error) {
      console.error('Error deleting ports:', error.message);
    }

    console.log('Port deletion completed');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

deletePorts(); 