const VesselTracking = require('../models/VesselTracking');
const connectDB = require('../config/database');
const mongoose = require('mongoose');

async function fetchVesselTrackingById(id) {
  try {
    // Connect to database
    await connectDB();
    
    // Use the native MongoDB driver query syntax
    const vessel = await mongoose.connection.db.collection('vessel_tracking')
      .findOne({ _id: new mongoose.Types.ObjectId(id) });
    
    if (!vessel) {
      console.log('No vessel found with the given ID');
      return null;
    }
    console.log('Vessel Tracking Data:', JSON.stringify(vessel, null, 2));
    return vessel;
  } catch (error) {
    console.error('Error fetching vessel tracking data:', error);
    return null;
  }
}

// Execute the function with the provided ID
fetchVesselTrackingById('5d7f34819792970001d9eaf6')
  .then((result) => {
    if (result) {
      console.log('Successfully fetched vessel data');
    }
    mongoose.connection.close();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    mongoose.connection.close();
    process.exit(1);
  }); 