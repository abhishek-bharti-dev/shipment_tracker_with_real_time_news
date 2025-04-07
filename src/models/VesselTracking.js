const mongoose = require('mongoose');

const vesselTrackingSchema = new mongoose.Schema({
  vessel_name: {
    type: String,
    required: true
  },
  vessel_code: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['intransit', 'delivered'],
    default: 'intransit'
  },
  lat_lon: {
    type: [Number],
    required: true,
    validate: {
      validator: function(v) {
        return v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number';
      },
      message: 'lat_lon must be an array of two numbers'
    }
  },
  source: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  events: [{
    port_code: {
      type: String,
      required: true
    },
    port_name: {
      type: String,
      required: true
    },
    expected_time_of_arrival: {
      type: Date,
      required: true
    },
    actual_time_of_arrival: {
      type: Date
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(v) {
          return v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number';
        },
        message: 'coordinates must be an array of two numbers'
      }
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('VesselTracking', vesselTrackingSchema); 