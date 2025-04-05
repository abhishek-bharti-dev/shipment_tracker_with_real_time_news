// Test script for port mapping functions
require('dotenv').config();
const mongoose = require('mongoose');
const { fetchAndStoreAffectedPortIds, getAllAffectedPortIds } = require('../src/services/port_mapping');
const Incident = require('../src/models/Incident');

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/shipment_tracker')
  .then(() => console.log('Connected to MongoDB for testing'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function testPortMapping() {
  try {
    console.log('Testing port mapping functions...');
    
    // Create some test incidents with affected port IDs
    await createTestIncidents();
    
    // Test fetching and storing affected port IDs
    console.log('Fetching and storing affected port IDs...');
    const fetchedPortIds = await fetchAndStoreAffectedPortIds();
    console.log(`Fetched ${fetchedPortIds.length} port IDs:`, fetchedPortIds);
    
    // Test getting all affected port IDs
    console.log('Getting all affected port IDs...');
    const storedPortIds = getAllAffectedPortIds();
    console.log(`Retrieved ${storedPortIds.length} port IDs from storage:`, storedPortIds);
    
    // Compare the results
    if (fetchedPortIds.length === storedPortIds.length) {
      console.log('Test passed: The number of fetched and stored port IDs match');
    } else {
      console.log('Test failed: The number of fetched and stored port IDs do not match');
    }
    
    // Clean up test data
    await cleanupTestData();
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed with error:', error.message);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Create test incidents with affected port IDs
async function createTestIncidents() {
  try {
    // Clear existing test incidents
    await Incident.deleteMany({ source_news_id: 'test-news' });
    
    // Create test incidents
    const testIncidents = [
      {
        incident_id: 'test-incident-1',
        source_news_id: 'test-news',
        location_type: 'port',
        affected_port_ids: ['PORT001', 'PORT002', 'PORT003'],
        lat_lon: [103.8198, 1.2649],
        start_time: new Date(),
        estimated_duration_days: 5,
        severity: 7,
        status: 'ongoing'
      },
      {
        incident_id: 'test-incident-2',
        source_news_id: 'test-news',
        location_type: 'port',
        affected_port_ids: ['PORT003', 'PORT004', 'PORT005'],
        lat_lon: [121.4737, 31.2304],
        start_time: new Date(),
        estimated_duration_days: 3,
        severity: 5,
        status: 'ongoing'
      },
      {
        incident_id: 'test-incident-3',
        source_news_id: 'test-news',
        location_type: 'sea',
        affected_port_ids: [],
        lat_lon: [4.4699, 51.9225],
        start_time: new Date(),
        estimated_duration_days: 2,
        severity: 4,
        status: 'ongoing'
      }
    ];
    
    await Incident.insertMany(testIncidents);
    console.log('Created test incidents');
  } catch (error) {
    console.error('Error creating test incidents:', error.message);
    throw error;
  }
}

// Clean up test data
async function cleanupTestData() {
  try {
    await Incident.deleteMany({ source_news_id: 'test-news' });
    console.log('Cleaned up test incidents');
  } catch (error) {
    console.error('Error cleaning up test incidents:', error.message);
  }
}

// Run the test
testPortMapping(); 