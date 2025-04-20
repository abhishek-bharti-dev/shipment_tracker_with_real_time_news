const mongoose = require('mongoose');

const gocometPortSchema = new mongoose.Schema({
    id: String,
    code: String,
    name: String,
    display_name: String
}, { 
    collection: 'gocomet_ports'
});

module.exports = mongoose.model('gocomet_ports', gocometPortSchema); 