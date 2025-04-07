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

const seaDelaySchema = new mongoose.Schema({
  lat_lon: {
    type: [Number],
    required: true
  },
  delay_days: {
    type: Number,
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
  location_type: {
    type: String,
    required: true,
    enum: ['port', 'sea']
  },
  affected_ports: {
    type: [portDelaySchema],
    required: function() {
      return this.location_type === 'port';
    }
  },
  sea_delays: {
    type: [seaDelaySchema],
    required: function() {
      return this.location_type === 'sea';
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Delay', delaySchema); 