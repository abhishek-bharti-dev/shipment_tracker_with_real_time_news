const mongoose = require('mongoose');
const VesselTracking = require('../models/VesselTracking');

const newVessels = [
  {
    vessel_name: 'CMA CGM Jacques Saadé',
    vessel_code: 'CMACGM002',
    lat_lon: [35.6762, 139.6503], // Tokyo coordinates
    source: 'JPTYO',
    destination: 'USLAX',
    events: [
      {
        port_code: 'JPTYO',
        port_name: 'Port of Tokyo',
        expected_time_of_arrival: new Date('2024-04-15T08:00:00Z'),
        actual_time_of_arrival: new Date('2024-04-15T07:45:00Z'),
        coordinates: [35.6762, 139.6503]
      },
      {
        port_code: 'USLAX',
        port_name: 'Port of Los Angeles',
        expected_time_of_arrival: new Date('2024-04-20T14:00:00Z'),
        coordinates: [33.7175, -118.2673]
      }
    ]
  },
  {
    vessel_name: 'MSC Irina',
    vessel_code: 'MSC003',
    lat_lon: [51.5074, -0.1278], // London coordinates
    source: 'GBLON',
    destination: 'CNQIN',
    events: [
      {
        port_code: 'GBLON',
        port_name: 'Port of London',
        expected_time_of_arrival: new Date('2024-04-16T09:00:00Z'),
        actual_time_of_arrival: new Date('2024-04-16T08:30:00Z'),
        coordinates: [51.5074, -0.1278]
      },
      {
        port_code: 'CNQIN',
        port_name: 'Port of Qingdao',
        expected_time_of_arrival: new Date('2024-04-22T11:00:00Z'),
        coordinates: [36.0671, 120.3826]
      }
    ]
  },
  {
    vessel_name: 'HMM Rotterdam',
    vessel_code: 'HMM002',
    lat_lon: [37.5665, 126.9780], // Seoul coordinates
    source: 'KRINC',
    destination: 'NLRTM',
    events: [
      {
        port_code: 'KRINC',
        port_name: 'Port of Incheon',
        expected_time_of_arrival: new Date('2024-04-17T10:00:00Z'),
        actual_time_of_arrival: new Date('2024-04-17T09:45:00Z'),
        coordinates: [37.5665, 126.9780]
      },
      {
        port_code: 'NLRTM',
        port_name: 'Port of Rotterdam',
        expected_time_of_arrival: new Date('2024-04-23T13:00:00Z'),
        coordinates: [51.9244, 4.4777]
      }
    ]
  }
];

async function addNewVessels() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://abhishek:1234@cluster0.xyyvvsu.mongodb.net/shipment_tracker?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');

    // Insert new vessels
    const insertedVessels = await VesselTracking.insertMany(newVessels);
    console.log(`Successfully inserted ${insertedVessels.length} new vessels`);

    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error adding new vessels:', error);
    process.exit(1);
  }
}

// Run the function
addNewVessels(); 