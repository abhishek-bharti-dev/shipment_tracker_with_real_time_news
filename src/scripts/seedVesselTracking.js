const mongoose = require('mongoose');
const VesselTracking = require('../models/VesselTracking');

// Sample vessel tracking data
const sampleVessels = [
  {
    vessel_name: "Maersk Alabama",
    vessel_code: "MAERSK001",
    lat_lon: [25.7617, -80.1918], // Miami coordinates
    source: "Miami, USA",
    destination: "Rotterdam, Netherlands",
    events: [
      {
        port_code: "USMIA",
        port_name: "Port of Miami",
        expected_time_of_arrival: new Date("2024-04-05T08:00:00Z"),
        actual_time_of_arrival: new Date("2024-04-05T07:45:00Z"),
        coordinates: [25.7617, -80.1918]
      },
      {
        port_code: "NLRTM",
        port_name: "Port of Rotterdam",
        expected_time_of_arrival: new Date("2024-04-15T14:00:00Z"),
        coordinates: [51.9225, 4.47917]
      }
    ]
  },
  {
    vessel_name: "Ever Given",
    vessel_code: "EVER001",
    lat_lon: [30.0444, 31.2357], // Cairo coordinates
    source: "Singapore",
    destination: "Port Said, Egypt",
    events: [
      {
        port_code: "SGSIN",
        port_name: "Port of Singapore",
        expected_time_of_arrival: new Date("2024-04-01T10:00:00Z"),
        actual_time_of_arrival: new Date("2024-04-01T09:30:00Z"),
        coordinates: [1.2833, 103.8333]
      },
      {
        port_code: "EGPSD",
        port_name: "Port Said",
        expected_time_of_arrival: new Date("2024-04-10T12:00:00Z"),
        coordinates: [31.2565, 32.2841]
      }
    ]
  },
  {
    vessel_name: "CMA CGM Marco Polo",
    vessel_code: "CMACGM001",
    lat_lon: [35.6762, 139.6503], // Tokyo coordinates
    source: "Tokyo, Japan",
    destination: "Los Angeles, USA",
    events: [
      {
        port_code: "JPTYO",
        port_name: "Port of Tokyo",
        expected_time_of_arrival: new Date("2024-04-03T09:00:00Z"),
        actual_time_of_arrival: new Date("2024-04-03T08:45:00Z"),
        coordinates: [35.6762, 139.6503]
      },
      {
        port_code: "USLAX",
        port_name: "Port of Los Angeles",
        expected_time_of_arrival: new Date("2024-04-18T16:00:00Z"),
        coordinates: [33.7175, -118.2728]
      }
    ]
  }
];

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/shipment_tracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB');
  return VesselTracking.deleteMany({}); // Clear existing data
})
.then(() => {
  console.log('Cleared existing vessel tracking data');
  return VesselTracking.insertMany(sampleVessels);
})
.then(() => {
  console.log('Successfully seeded vessel tracking data');
  process.exit(0);
})
.catch((error) => {
  console.error('Error seeding data:', error);
  process.exit(1);
}); 