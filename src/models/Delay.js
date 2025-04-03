const mongoose = require('mongoose');

const delaySchema = new mongoose.Schema({
  delay_id: {
    type: String,
    required: true,
    unique: true
  },
  shipment_id: {
    type: String,
    ref: 'VesselTracking',
    required: true
  },
  port_id: {
    type: String,
    ref: 'Port',
  },
  expected_delay_days: {
    type: Number,
    required: true
  },
  incident_id: {
    type: String,
    ref: 'Incident',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Delay', delaySchema); 