// Script to console all affected port IDs
require('dotenv').config();
const mongoose = require('mongoose');
const { consoleAllAffectedPortIds } = require('../src/services/port_mapping');

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/shipment_tracker')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Console all affected port IDs
consoleAllAffectedPortIds()
  .then(() => {
    console.log('Finished displaying affected port IDs');
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Error:', err.message);
    mongoose.connection.close();
  }); 