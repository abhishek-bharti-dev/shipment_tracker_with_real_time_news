const mongoose = require('mongoose');
require('dotenv').config();
const VesselTracking = require('../models/VesselTracking');
const Shipment = require('../models/Shipment');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URI2);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const generateCargoType = (vesselName) => {
  // Simple logic to assign cargo types based on vessel names
  if (vesselName.includes('Explorer')) return 'General Cargo';
  if (vesselName.includes('Trader')) return 'Container';
  if (vesselName.includes('Star')) return 'Bulk Carrier';
  if (vesselName.includes('Voyager')) return 'Tanker';
  if (vesselName.includes('Carrier')) return 'RoRo';
  return 'Container'; // default cargo type
};

const insertShipmentData = async () => {
  try {
    // Connect to the database
    await connectDB();

    // Fetch all vessel tracking records
    const vesselTrackings = await VesselTracking.find({});
    console.log(`Found ${vesselTrackings.length} vessel tracking records`);

    // Prepare shipment data
    const shipmentData = vesselTrackings.map((vessel, index) => ({
      shipment_id: `SHP${String(index + 1).padStart(4, '0')}`,
      client_id: '1', // Using string '1' as client_id
      tracking_id: vessel._id,
      cargo_type: generateCargoType(vessel.vessel_name),
      POL: vessel.source,
      POD: vessel.destination
    }));

    // Insert the shipment data
    const result = await Shipment.insertMany(shipmentData);
    console.log(`${result.length} shipment records inserted successfully`);

    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error inserting shipment data:', error);
    process.exit(1);
  }
};

// Run the script
insertShipmentData(); 