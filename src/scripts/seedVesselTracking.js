const mongoose = require('mongoose');
const VesselTracking = require('../models/VesselTracking');

// Sample port data
const ports = [
  { code: 'SAJED', name: 'Jeddah Islamic Port', coordinates: [21.5433, 39.1728] },
  { code: 'VLC', name: 'Valencia', coordinates: [39.4699, -0.3763] },
  { code: 'LIV', name: 'Livorno', coordinates: [43.5528, 10.3089] },
  { code: 'SGSIN', name: 'Singapore', coordinates: [1.2644, 103.8222] },
  { code: 'CNHKG', name: 'Hong Kong', coordinates: [22.3027, 114.1772] }
];

// Sample vessel data with affected ports
const vessels = [
  {
    vessel_name: 'Maersk Alabama',
    vessel_code: 'MAERSK001',
    lat_lon: [38, 20], // Current position near affected ports
    source: 'SAJED',
    destination: 'SDPSN',
    events: [
      {
        port_code: 'SAJED',
        port_name: 'Jeddah Islamic Port',
        expected_time_of_arrival: new Date('2024-04-01T10:00:00Z'),
        actual_time_of_arrival: new Date('2024-04-01T09:45:00Z'),
        coordinates: [38, 20]
      },
      {
        port_code: 'JOAQB',
        port_name: 'Aqaba',
        expected_time_of_arrival: new Date('2024-04-03T14:00:00Z'),
        coordinates: [38, 20]
      },
      {
        port_code: 'SDPSN',
        port_name: 'Port Sudan',
        expected_time_of_arrival: new Date('2024-04-05T08:00:00Z'),
        coordinates: [38, 20]
      }
    ]
  },
  {
    vessel_name: 'Ever Given',
    vessel_code: 'EVER001',
    lat_lon: [38, 20],
    source: 'ERMSA',
    destination: 'SAJED',
    events: [
      {
        port_code: 'ERMSA',
        port_name: 'Massawa Port',
        expected_time_of_arrival: new Date('2024-04-02T08:00:00Z'),
        actual_time_of_arrival: new Date('2024-04-02T07:30:00Z'),
        coordinates: [38, 20]
      },
      {
        port_code: 'JOAQB',
        port_name: 'Aqaba',
        expected_time_of_arrival: new Date('2024-04-04T12:00:00Z'),
        coordinates: [38, 20]
      },
      {
        port_code: 'SAJED',
        port_name: 'Jeddah Islamic Port',
        expected_time_of_arrival: new Date('2024-04-06T16:00:00Z'),
        coordinates: [38, 20]
      }
    ]
  },
  {
    vessel_name: 'MSC Oscar',
    vessel_code: 'MSC001',
    lat_lon: [38, 20],
    source: 'SDPSN',
    destination: 'ERMSA',
    events: [
      {
        port_code: 'SDPSN',
        port_name: 'Port Sudan',
        expected_time_of_arrival: new Date('2024-04-03T14:00:00Z'),
        actual_time_of_arrival: new Date('2024-04-03T13:45:00Z'),
        coordinates: [38, 20]
      },
      {
        port_code: 'SAJED',
        port_name: 'Jeddah Islamic Port',
        expected_time_of_arrival: new Date('2024-04-05T09:00:00Z'),
        coordinates: [38, 20]
      },
      {
        port_code: 'ERMSA',
        port_name: 'Massawa Port',
        expected_time_of_arrival: new Date('2024-04-07T11:00:00Z'),
        coordinates: [38, 20]
      }
    ]
  }
];

// Additional vessel data with affected ports
const additionalVessels = [
  {
    vessel_name: 'CMA CGM Marco Polo',
    vessel_code: 'CMACGM001',
    lat_lon: [38, 20],
    source: 'JOAQB',
    destination: 'ERMSA',
    events: [
      {
        port_code: 'JOAQB',
        port_name: 'Aqaba',
        expected_time_of_arrival: new Date('2024-04-04T08:00:00Z'),
        actual_time_of_arrival: new Date('2024-04-04T07:30:00Z'),
        coordinates: [38, 20]
      },
      {
        port_code: 'SAJED',
        port_name: 'Jeddah Islamic Port',
        expected_time_of_arrival: new Date('2024-04-06T12:00:00Z'),
        coordinates: [38, 20]
      },
      {
        port_code: 'ERMSA',
        port_name: 'Massawa Port',
        expected_time_of_arrival: new Date('2024-04-08T16:00:00Z'),
        coordinates: [38, 20]
      }
    ]
  },
  {
    vessel_name: 'HMM Algeciras',
    vessel_code: 'HMM001',
    lat_lon: [38, 20],
    source: 'SDPSN',
    destination: 'JOAQB',
    events: [
      {
        port_code: 'SDPSN',
        port_name: 'Port Sudan',
        expected_time_of_arrival: new Date('2024-04-05T10:00:00Z'),
        actual_time_of_arrival: new Date('2024-04-05T09:45:00Z'),
        coordinates: [38, 20]
      },
      {
        port_code: 'ERMSA',
        port_name: 'Massawa Port',
        expected_time_of_arrival: new Date('2024-04-07T14:00:00Z'),
        coordinates: [38, 20]
      },
      {
        port_code: 'JOAQB',
        port_name: 'Aqaba',
        expected_time_of_arrival: new Date('2024-04-09T08:00:00Z'),
        coordinates: [38, 20]
      }
    ]
  },
  {
    vessel_name: 'MSC Gülsün',
    vessel_code: 'MSC002',
    lat_lon: [38, 20],
    source: 'ERMSA',
    destination: 'SDPSN',
    events: [
      {
        port_code: 'ERMSA',
        port_name: 'Massawa Port',
        expected_time_of_arrival: new Date('2024-04-06T09:00:00Z'),
        actual_time_of_arrival: new Date('2024-04-06T08:45:00Z'),
        coordinates: [38, 20]
      },
      {
        port_code: 'JOAQB',
        port_name: 'Aqaba',
        expected_time_of_arrival: new Date('2024-04-08T13:00:00Z'),
        coordinates: [38, 20]
      },
      {
        port_code: 'SDPSN',
        port_name: 'Port Sudan',
        expected_time_of_arrival: new Date('2024-04-10T17:00:00Z'),
        coordinates: [38, 20]
      }
    ]
  }
];

async function seedVesselTracking() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://abhishek:1234@cluster0.xyyvvsu.mongodb.net/shipment_tracker?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');

    // Insert new data without clearing existing data
    const insertedVessels = await VesselTracking.insertMany(additionalVessels);
    console.log(`Successfully inserted ${insertedVessels.length} additional vessels`);

    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error seeding vessel tracking data:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedVesselTracking(); 