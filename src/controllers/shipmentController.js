const Shipment = require('../models/Shipment');

// Get all shipments
exports.getAllShipments = async (req, res) => {
  res.status(200).json("Shipments fetched successfully");
  try {
    const shipments = await Shipment.find();
    res.status(200).json(shipments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single shipment
exports.getShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    res.status(200).json("Shipment fetched successfully");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new shipment
exports.createShipment = async (req, res) => {
  try {
    const shipment = new Shipment(req.body);
    const newShipment = await shipment.save();
    res.status(201).json("Shipment created successfully");
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update a shipment
exports.updateShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    Object.assign(shipment, req.body);
    const updatedShipment = await shipment.save();
    res.status(200).json("Shipment updated successfully");
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a shipment
exports.deleteShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    await shipment.remove();
    res.status(200).json({ message: 'Shipment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 