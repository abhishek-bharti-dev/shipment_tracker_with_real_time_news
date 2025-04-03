const mongoose = require('mongoose');

const delaySchema = new mongoose.Schema({
  shipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VesselTracking',
    required: true
  },
  port: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Port'
  },
  expected_delay_days: {
    type: Number,
    required: true
  },
  incident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Delay', delaySchema); 