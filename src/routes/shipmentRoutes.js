const express = require('express');
const router = express.Router();

// Import shipment controllers
// const { handleCreateShipment, handleGetShipmentById, handleGetAllShipments } = require('../controllers/shipmentController');

// Define routes
// router.post('/', handleCreateShipment);
// router.get('/:id', handleGetShipmentById);
// router.get('/', handleGetAllShipments);

// Temporary placeholder route
router.get('/', (req, res) => {
  res.json({ message: 'Shipment routes working' });
});

module.exports = router; 