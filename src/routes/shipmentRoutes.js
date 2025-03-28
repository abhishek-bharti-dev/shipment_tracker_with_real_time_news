const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipmentController');

// Get all shipments
router.get('/health_check', shipmentController.getAllShipments);

// Get single shipment
router.get('/:id', shipmentController.getShipment);

// Create new shipment
router.post('/', shipmentController.createShipment);

// Update shipment
router.put('/:id', shipmentController.updateShipment);

// Delete shipment
router.delete('/:id', shipmentController.deleteShipment);

module.exports = router; 