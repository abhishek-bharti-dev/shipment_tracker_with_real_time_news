const mongoose = require('mongoose');
const Port = require('../src/models/Port');

const ports = [
  {
    _id: '67eeece1501f721c7f281374',
    port_code: 'USLAX',
    port_name: 'Los Angeles Port',
    lat_lon: [33.7542, -118.2167]
  },
  {
    _id: '67eeece1501f721c7f281377',
    port_code: 'USNYC',
    port_name: 'New York Port',
    lat_lon: [40.7128, -74.0060]
  },
  {
    _id: '67eeece1501f721c7f28137a',
    port_code: 'DEHAM',
    port_name: 'Hamburg Port',
    lat_lon: [53.5511, 9.9937]
  },
  {
    _id: '67eeece1501f721c7f28137d',
    port_code: 'NLRTM',
    port_name: 'Rotterdam Port',
    lat_lon: [51.9225, 4.4792]
  },
  {
    _id: '67eeece1501f721c7f281380',
    port_code: 'AESYD',
    port_name: 'Sydney Port',
    lat_lon: [-33.8688, 151.2093]
  }
];

async function insertPorts() {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect("mongodb+srv://abhishek:1234@cluster0.xyyvvsu.mongodb.net/shipment_tracker?retryWrites=true&w=majority&appName=Cluster0");
    console.log('Successfully connected to MongoDB');

    // Insert ports
    for (const port of ports) {
      try {
        const newPort = new Port(port);
        await newPort.save();
        console.log(`Successfully inserted port: ${port.port_name} (${port.port_code})`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`Port ${port.port_name} (${port.port_code}) already exists`);
        } else {
          console.error(`Error inserting port ${port.port_name}:`, error.message);
        }
      }
    }

    console.log('Port insertion completed');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

insertPorts(); 