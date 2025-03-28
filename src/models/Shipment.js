const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  trackingNumber: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_transit', 'delivered', 'delayed'],
    default: 'pending'
  },
  origin: {
    address: String,
    city: String,
    country: String,
    postalCode: String
  },
  destination: {
    address: String,
    city: String,
    country: String,
    postalCode: String
  },
  estimatedDeliveryDate: Date,
  actualDeliveryDate: Date,
  carrier: String,
  weight: Number,
  relatedNews: [{
    title: String,
    content: String,
    url: String,
    publishedDate: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
shipmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Shipment', shipmentSchema); 