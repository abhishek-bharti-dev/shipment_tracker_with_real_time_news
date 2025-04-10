const mongoose = require('mongoose');
const Port = require('../models/Port');

const ports = [
  {
    port_code: 'JPTYO',
    port_name: 'Port of Tokyo',
    lat_lon: [35.6762, 139.6503]
  },
  {
    port_code: 'INNSA',
    port_name: 'Jawaharlal Nehru Port (Nhava Sheva)',
    lat_lon: [18.9517, 72.9519]
  },
  {
    port_code: 'GBLON',
    port_name: 'Port of London',
    lat_lon: [51.5074, -0.1278]
  },
  {
    port_code: 'CNQIN',
    port_name: 'Port of Qingdao',
    lat_lon: [36.0671, 120.3826]
  },
  {
    port_code: 'KRINC',
    port_name: 'Port of Incheon',
    lat_lon: [37.5665, 126.9780]
  },
  {
    port_code: 'INCCU',
    port_name: 'Kolkata Port (Syama Prasad Mookerjee Port)',
    lat_lon: [22.5350, 88.3244]
  }
];

async function addPorts() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://abhishek:1234@cluster0.xyyvvsu.mongodb.net/shipment_tracker?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');

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

// Run the function
addPorts(); 