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
  events: [{
    port: {
      id: String,
      name: String,
      code: String,
      country_code: String
    },
    planned_date: Date,
    actual_date: Date,
    is_arrival: Boolean
  }],
  path: [{
    coordinates: [Number],
    timestamp: Date
  }],
  shipload_ids: [String],
  _status: {
    type: String,
    enum: ['all_good', 'warning', 'error']
  },
  next_schedule: Date,
  speed: Number,
  link: String,
  shipload_update_analysis_data: [{
    shipload_id: String,
    vessel_name: String,
    event_type: String,
    shipload_event_location: String,
    vessel_event_location: String,
    shipload_event_planned_date: Date,
    vessel_event_planned_date: Date,
    shipload_event_actual_date: Date,
    vessel_event_actual_date: Date,
    shipload_event_port_id: String,
    distance_between_ports: Number,
    performed_at: Date
  }],
  shipid: Number,
  daily_crawl: Boolean,
  imo_number: Number,
  is_demo_vessel: Boolean,
  last_position_received_at: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('vessel_tracking', vesselTrackingSchema); 