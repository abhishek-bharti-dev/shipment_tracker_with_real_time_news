const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const connectDB = require('./config/database');
const DelayService = require('./services/delayService');

async function testDelayProcessing() {
    try {
        console.log('Connecting to MongoDB...');
        await connectDB();
        console.log('Connected to MongoDB successfully');

        console.log('\nRunning processUnupdatedDelayPort...');
        await DelayService.processUnupdatedDelayPort();

    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nMongoDB connection closed');
    }
}

testDelayProcessing(); 