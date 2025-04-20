const mongoose = require('mongoose');
require('dotenv').config();
const GocometPort = require('../models/gocomet_ports');

// MongoDB connection configuration
const MONGODB_URI = process.env.DATABASE_URI3 || 'mongodb://192.168.0.107:27017/shipment_tracker';
const MONGODB_OPTIONS = {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    readPreference: 'secondaryPreferred',
    maxPoolSize: 10,
    minPoolSize: 5
};

// Function to get ports from shipload events
async function getPortsFromShiploads() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI, MONGODB_OPTIONS);
        console.log('Connected to MongoDB');

        // Define schema for shiploads with index
        const shiploadSchema = new mongoose.Schema({
            status: { type: Number, index: true },
            events: Object
        }, { 
            collection: 'gocomet_shiploads'
        });

        // Add compound index for faster queries
        shiploadSchema.index({ status: 1, '_id': 1 });

        // Register the model
        const Shipload = mongoose.models.Shipload || mongoose.model('Shipload', shiploadSchema);

        console.time('Query Execution');

        // Get shiploads with their port information and planned dates
        const portPipeline = [
            // Match status 2 shiploads
            { $match: { status: 2 } },
            
            // Convert events object to array
            { $project: {
                shipload_id: '$_id',
                eventArray: { $objectToArray: '$events' }
            }},
            
            // Unwind the events array
            { $unwind: '$eventArray' },
            
            // Match events with mode 1 and null actual_date
            { $match: {
                'eventArray.v.mode': 1,
                'eventArray.v.port': { $exists: true },
                'eventArray.v.port.id': { $exists: true },
                'eventArray.v.actual_date': null
            }},
            
            // Project required fields
            { $project: {
                shipload_id: 1,
                port_id: '$eventArray.v.port.id',
                planned_date: '$eventArray.v.planned_date'
            }},
            
            // Group by port_id
            { $group: {
                _id: '$port_id',
                shipments: { 
                    $push: {
                        shipload_id: '$shipload_id',
                        planned_date: '$planned_date'
                    }
                }
            }}
        ];

        const portShipmentData = await Shipload.aggregate(portPipeline).exec();
        console.timeEnd('Query Execution');

        // Define port schema
        const portSchema = new mongoose.Schema({
            id: String,
            name: String,
            code: String
        }, { collection: 'gocomet_ports' });

        // Register the model
        const Port = mongoose.models.Port || mongoose.model('Port', portSchema);

        // Get all unique port IDs
        const uniquePortIds = portShipmentData.map(item => item._id);

        // Fetch port details
        const ports = await Port.find(
            { id: { $in: uniquePortIds } },
            { id: 1, code: 1, name: 1 }
        ).lean();

        // Create a map of port IDs to port codes
        const portCodeMap = new Map(ports.map(port => [port.id, { code: port.code, name: port.name }]));

        // Combine port and shipment data
        const result = {};
        portShipmentData.forEach(portData => {
            const portInfo = portCodeMap.get(portData._id);
            if (portInfo) {
                result[portData._id] = {
                    port_code: portInfo.code,
                    port_name: portInfo.name,
                    shipments: portData.shipments.map(shipment => ({
                        shipload_id: shipment.shipload_id.toString(),
                        planned_date: shipment.planned_date
                    }))
                };
            }
        });

        // Print the result in a formatted way
        console.log('\nPort and Shipment Data:');
        console.log(JSON.stringify(result, null, 2));

        return result;

    } catch (error) {
        console.error('Error in getPortsFromShiploads:', error.message);
        throw error;
    } finally {
        // Properly close mongoose connection
        try {
            await mongoose.disconnect();
            console.log('MongoDB connection closed');
        } catch (err) {
            console.error('Error closing MongoDB connection:', err.message);
        }
    }
}

// Run the script
if (require.main === module) {
    (async () => {
        try {
            await getPortsFromShiploads();
            process.exit(0);
        } catch (error) {
            console.error('Script execution failed:', error.message);
            process.exit(1);
        }
    })();
}

module.exports = getPortsFromShiploads;
