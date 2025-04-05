const mongoose = require('mongoose');

const portDelaySchema = new mongoose.Schema({
  port: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Port',
    required: true
  },
  delay_days: {
    type: Number,
    required: true
  },
  port_name: {
    type: String,
    required: true
  },
  port_code: {
    type: String,
    required: true
  },
  incident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    required: true
  }
});

const delaySchema = new mongoose.Schema({
  shipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VesselTracking',
    required: true
  },
  affected_ports: [portDelaySchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Delay', delaySchema); 