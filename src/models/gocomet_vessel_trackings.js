const mongoose = require('mongoose');

const gocometVesselTrackingSchema = new mongoose.Schema({
  vessel_name: {
    type: String,
    required: true
  },
  lat_lon: {
    type: Array,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  shipload_ids: [{
    type: String
  }]
}, {
  timestamps: true
});

// Create geospatial index for location
gocometVesselTrackingSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('gocomet_vessel_trackings', gocometVesselTrackingSchema); 