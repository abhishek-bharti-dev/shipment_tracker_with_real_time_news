// Main entry point for the application
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT || 3000;
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const newsIngestionRoutes = require('./routes/newsIngestionRoutes');
const mapVisualizationRoutes = require('./routes/mapVisualization');
const vesselTrackingRoutes = require('./routes/vesselTrackingRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const shipmentStatsRoutes = require('./routes/shipmentStatsRoutes');
const delayRoutes = require('./routes/delayRoutes');
const emailRoutes = require('./routes/emailRoutes');
// Import the news pipeline scheduler
const newsPipelineScheduler = require('./schedulers/news_pipeline');
const incidentResolutionScheduler = require('./schedulers/incident_resolution_scheduler');
const resolveIncidentRoutes = require('./routes/resolveIncidents');
const graphDataRoutes = require('./routes/graphData');
// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());

// CORS middleware (if needed)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Routes
app.get('/', (req, res) => {
  res.send('Welcome to Shipment Tracker with Real-time News');
});

// Mount auth routes (signup and login are public, others require authentication)
app.use('/api/auth', authRoutes);

// Mount news ingestion routes
app.use('/api/news', newsIngestionRoutes);

// Mount presentation routes
app.use('/api/presentation', mapVisualizationRoutes);

// Mount vessel tracking routes
app.use('/api/presentation', vesselTrackingRoutes);

// Mount incident routes
app.use('/api/presentation', incidentRoutes);

// Mount graph data routes
app.use('/api/graph-data', graphDataRoutes);

// Mount email routes
app.use('/api/email', emailRoutes);

// Mount shipment stats routes
app.use('/api/shipment-stats', shipmentStatsRoutes);

// Mount delay routes
app.use('/api/delays', delayRoutes);

// Mount resolve incident routes
app.use('/api/delays', resolveIncidentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Start server with port fallback
const startServer = (portToTry) => {
  const server = app.listen(portToTry, () => {
    console.log(`\n🚀 Server is running on port ${portToTry}`);
    console.log('⏰ Current time:', new Date().toISOString());
    
    // Start the schedulers only after the server is running
    // Add a small delay to ensure everything is properly initialized
    setTimeout(() => {
      newsPipelineScheduler.start();
      incidentResolutionScheduler.start();
    }, 1000);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${portToTry} is busy, trying ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      console.error('Server error:', err);
    }
  });
  
  // Handle graceful shutdown
  const shutdown = () => {
    console.log('\n🛑 Shutting down server...');
    newsPipelineScheduler.stop();
    server.close(() => {
      console.log('✅ HTTP server closed');
      mongoose.connection.close(false, () => {
        console.log('✅ MongoDB connection closed');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

// Start the server
startServer(port);
