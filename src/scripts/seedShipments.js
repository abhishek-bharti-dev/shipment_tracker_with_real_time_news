const mongoose = require('mongoose');
const Shipment = require('../models/Shipment');
const VesselTracking = require('../models/VesselTracking');

async function seedShipments() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://abhishek:1234@cluster0.xyyvvsu.mongodb.net/shipment_tracker?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');

    // Get all vessels from VesselTracking
    const vessels = await VesselTracking.find({});
    console.log(`Found ${vessels.length} vessels to create shipments for`);

    // Sample shipment data
    const shipments = vessels.map((vessel, index) => ({
      shipment_id: `SHIP${String(index + 1).padStart(4, '0')}`,
      client_id: new mongoose.Types.ObjectId(), // Generate a new ObjectId for client
      tracking_id: vessel._id, // Use the vessel's _id as tracking_id
      cargo_type: ['Container', 'Bulk', 'Liquid', 'General Cargo'][Math.floor(Math.random() * 4)],
      POL: vessel.source, // Use vessel's source as POL
      POD: vessel.destination // Use vessel's destination as POD
    }));

    // Insert shipments
    const insertedShipments = await Shipment.insertMany(shipments);
    console.log(`Successfully inserted ${insertedShipments.length} shipments`);

    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error seeding shipment data:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedShipments(); 