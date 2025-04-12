const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  shipment_id: {
    type: String,
    required: true,
    unique: true
  },
  client_id: {
    type: String,
    required: true
  },
  tracking_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VesselTracking',
    required: true
  },
  cargo_type: {
    type: String,
    required: true
  },
  POL: {
    type: String,
    required: true
  },
  POD: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Shipment', shipmentSchema); 