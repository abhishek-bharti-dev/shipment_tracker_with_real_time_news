// Main entry point for the application
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const connectDB = require('./config/database');
const shipmentRoutes = require('./routes/shipmentRoutes');
const newsIngestionRoutes = require('./routes/newsIngestionRoutes');

// Connect to MongoDB
connectDB();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to Shipment Tracker with Real-time News');
});

// Mount shipment routes
app.use('/api/shipments', shipmentRoutes);
app.use(newsIngestionRoutes);
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 