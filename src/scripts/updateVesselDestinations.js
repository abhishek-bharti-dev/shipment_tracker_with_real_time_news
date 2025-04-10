const mongoose = require('mongoose');
const VesselTracking = require('../models/VesselTracking');

async function updateVesselDestinations() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://abhishek:1234@cluster0.xyyvvsu.mongodb.net/shipment_tracker?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');

    // Update first vessel (Tokyo to Mumbai)
    const vessel1 = await VesselTracking.findById('67f50348aa99b67b19147c5d');
    if (vessel1) {
      vessel1.destination = 'INNSA';
      vessel1.events[1] = {
        port_code: 'INNSA',
        port_name: 'Jawaharlal Nehru Port (Nhava Sheva)',
        expected_time_of_arrival: new Date('2024-04-20T14:00:00Z'),
        coordinates: [18.9517, 72.9519]
      };
      await vessel1.save();
      console.log('Updated first vessel destination to INNSA');
    }

    // Update third vessel (Incheon to Kolkata)
    const vessel3 = await VesselTracking.findById('67f50348aa99b67b19147c63');
    if (vessel3) {
      vessel3.destination = 'INCCU';
      vessel3.events[1] = {
        port_code: 'INCCU',
        port_name: 'Kolkata Port (Syama Prasad Mookerjee Port)',
        expected_time_of_arrival: new Date('2024-04-23T13:00:00Z'),
        coordinates: [22.5350, 88.3244]
      };
      await vessel3.save();
      console.log('Updated third vessel destination to INCCU');
    }

    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error updating vessel destinations:', error);
    process.exit(1);
  }
}

// Run the function
updateVesselDestinations(); 