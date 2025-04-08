const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  source_news: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'News',
    required: true
  },
  location_type: {
    type: String,
    required: true,
    enum: ['port', 'sea']
  },
  affected_ports: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Port',
    required: function() {
      return this.location_type === 'port';
    }
  },
  lat_lon: {
    type: [Number],
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length === 2 && 
               typeof v[0] === 'number' && typeof v[1] === 'number' || v.length === 0;
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
  },
  delay_updated: {
    type: Boolean,
    default: false
  },
  total_shipments_affected: {
    type: Number,
    default: 0
  },
  total_shipments_resolved:{
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('incidents', incidentSchema); 