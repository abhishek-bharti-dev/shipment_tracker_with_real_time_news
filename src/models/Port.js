const mongoose = require('mongoose');

const portSchema = new mongoose.Schema({
  port_id: {
    type: String,
    required: true,
    unique: true
  },
  port_code: {
    type: String,
    required: true
  },
  port_name: {
    type: String,
    required: true
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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Port', portSchema); 