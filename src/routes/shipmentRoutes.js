const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipmentController');
const { authenticate } = require('../security/authMiddleware');

// All routes require authentication
router.get('/health_check', authenticate, shipmentController.healthCheck);
router.get('/', authenticate, shipmentController.getAllShipments);
router.get('/:id', authenticate, shipmentController.getShipment);
router.post('/', authenticate, shipmentController.createShipment);
router.put('/:id', authenticate, shipmentController.updateShipment);
router.delete('/:id', authenticate, shipmentController.deleteShipment);

module.exports = router; 