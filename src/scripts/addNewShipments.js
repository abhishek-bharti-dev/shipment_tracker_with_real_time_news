const mongoose = require('mongoose');
const Shipment = require('../models/Shipment');

const shipments = [
  {
    shipment_id: 'SHIP001',
    client_id: '67f35cfaf1a4fb79a61350e6',
    tracking_id: '67f50348aa99b67b19147c5d',
    cargo_type: 'Container',
    POL: 'JPTYO',
    POD: 'USLAX'
  },
  {
    shipment_id: 'SHIP002',
    client_id: '67f35cfaf1a4fb79a61350e6',
    tracking_id: '67f50348aa99b67b19147c60',
    cargo_type: 'Bulk',
    POL: 'GBLON',
    POD: 'CNQIN'
  },
  {
    shipment_id: 'SHIP003',
    client_id: '67f35cfaf1a4fb79a61350e6',
    tracking_id: '67f50348aa99b67b19147c63',
    cargo_type: 'Liquid',
    POL: 'KRINC',
    POD: 'NLRTM'
  },
  {
    shipment_id: 'SHIP004',
    client_id: '67f35cfaf1a4fb79a61350e6',
    tracking_id: '67f50348aa99b67b19147c5d',
    cargo_type: 'Container',
    POL: 'JPTYO',
    POD: 'USLAX'
  },
  {
    shipment_id: 'SHIP005',
    client_id: '67f35cfaf1a4fb79a61350e6',
    tracking_id: '67f50348aa99b67b19147c60',
    cargo_type: 'General Cargo',
    POL: 'GBLON',
    POD: 'CNQIN'
  },
  {
    shipment_id: 'SHIP006',
    client_id: '67f35cfaf1a4fb79a61350e6',
    tracking_id: '67f50348aa99b67b19147c63',
    cargo_type: 'Container',
    POL: 'KRINC',
    POD: 'NLRTM'
  },
  {
    shipment_id: 'SHIP007',
    client_id: '67f35cfaf1a4fb79a61350e6',
    tracking_id: '67f50348aa99b67b19147c5d',
    cargo_type: 'Bulk',
    POL: 'JPTYO',
    POD: 'USLAX'
  },
  {
    shipment_id: 'SHIP008',
    client_id: '67f35cfaf1a4fb79a61350e6',
    tracking_id: '67f50348aa99b67b19147c60',
    cargo_type: 'Liquid',
    POL: 'GBLON',
    POD: 'CNQIN'
  },
  {
    shipment_id: 'SHIP009',
    client_id: '67f35cfaf1a4fb79a61350e6',
    tracking_id: '67f50348aa99b67b19147c63',
    cargo_type: 'Container',
    POL: 'KRINC',
    POD: 'NLRTM'
  },
  {
    shipment_id: 'SHIP010',
    client_id: '67f35cfaf1a4fb79a61350e6',
    tracking_id: '67f50348aa99b67b19147c5d',
    cargo_type: 'General Cargo',
    POL: 'JPTYO',
    POD: 'USLAX'
  }
];

async function addNewShipments() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://abhishek:1234@cluster0.xyyvvsu.mongodb.net/shipment_tracker?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');

    // Insert new shipments
    const insertedShipments = await Shipment.insertMany(shipments);
    console.log(`Successfully inserted ${insertedShipments.length} new shipments`);

    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error adding new shipments:', error);
    process.exit(1);
  }
}

// Run the function
addNewShipments(); 