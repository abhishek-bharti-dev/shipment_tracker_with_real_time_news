const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  news_hash: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  news_details: {
    type: String,
    required: true
  },
  published_date: {
    type: Date
  },
  news_location: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('News', newsSchema); 