const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://abhishek:1234@cluster0.xyyvvsu.mongodb.net/shipment_tracker?retryWrites=true&w=majority&appName=Cluster0');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB; 