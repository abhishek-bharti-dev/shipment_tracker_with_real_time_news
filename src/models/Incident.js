const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  incident_id: {
    type: String,
    required: true,
    unique: true
  },
  source_news_id: {
    type: String,
    ref: 'News',
    required: true
  },
  location_type: {
    type: String,
    required: true,
    enum: ['port', 'sea']
  },
  affected_port_ids: {
    type: [String],
    ref: 'Port',
    required: function() {
      return this.location_type === 'port';
    }
  },
  lat_lon: {
    type: [Number],
    required: true,
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length === 2 && 
               typeof v[0] === 'number' && typeof v[1] === 'number';
      },
      message: props => `${props.value} is not a valid lat_lon array!`
    }
  },
  start_time: {
    type: Date,
  },
  estimated_duration_days: {
    type: Number,
    required: true
  },
  severity: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  status: {
    type: String,
    required: true,
    enum: ['ongoing', 'resolved'],
    default: 'ongoing'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Incident', incidentSchema); 