// Script to fetch affected port IDs for a specific incident
require('dotenv').config();
const mongoose = require('mongoose');
const { getAffectedPortIdsForIncident } = require('../src/services/port_mapping');

// The incident ID to look up
const incidentId = '32ad5079fd9774d7b9fe4cb3f9234c47';

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/shipment_tracker')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Get affected port IDs for the specific incident
getAffectedPortIdsForIncident(incidentId)
  .then(() => {
    console.log('Finished displaying incident details');
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Error:', err.message);
    mongoose.connection.close();
  }); 