const mongoose = require('mongoose');
require('dotenv').config();

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

        // First get total count of status 2 documents
        const totalStatus2Count = await Shipload.countDocuments({ status: 2 });

        // Use aggregation pipeline for better performance
        const pipeline = [
            // Match status 2 documents
            { $match: { status: 2 } },
            
            // Add a stage to ensure events exist
            { $match: { events: { $exists: true } } },
            
            // Project only needed fields and do initial filtering
            { $project: {
                _id: 1,
                eventArray: { $objectToArray: '$events' }
            }},
            
            // Unwind events array
            { $unwind: '$eventArray' },
            
            // Filter events with mode 1 and has port
            { $match: {
                'eventArray.v.mode': 1,
                'eventArray.v.port': { $exists: true },
                'eventArray.v.port.id': { $exists: true }
            }},
            
            // Group by shipload ID and collect unique port IDs
            { $group: {
                _id: '$_id',
                portIds: { $addToSet: '$eventArray.v.port.id' }
            }},
            
            // Facet to get all required statistics in one go
            { $facet: {
                shiploadsWithPorts: [
                    { $group: {
                        _id: null,
                        shiploadIds: { $addToSet: '$_id' },
                        allPortIds: { $push: '$portIds' }
                    }}
                ],
                portStats: [
                    { $unwind: '$portIds' },
                    { $group: {
                        _id: null,
                        uniquePorts: { $addToSet: '$portIds' },
                        totalPorts: { $sum: 1 }
                    }}
                ]
            }}
        ];

        const [result] = await Shipload.aggregate(pipeline).exec();

        console.timeEnd('Query Execution');

        // Extract statistics
        const shiploadsWithPorts = result.shiploadsWithPorts[0] || { shiploadIds: [], allPortIds: [] };
        const portStats = result.portStats[0] || { uniquePorts: [], totalPorts: 0 };

        const stats = {
            totalShiploadsWithStatus2: totalStatus2Count,
            shiploadsWithMode1Events: shiploadsWithPorts.shiploadIds.length,
            totalUniquePorts: portStats.uniquePorts.length,
            totalPorts: portStats.totalPorts
        };

        // Print summary
        console.log('\nStatistics:');
        console.log(`Total shiploads with status 2: ${stats.totalShiploadsWithStatus2}`);
        console.log(`Shiploads with mode 1 events: ${stats.shiploadsWithMode1Events}`);
        console.log(`Shiploads without mode 1 events: ${stats.totalShiploadsWithStatus2 - stats.shiploadsWithMode1Events}`);
        console.log(`Total ports found: ${stats.totalPorts}`);
        console.log(`Total unique ports across all shiploads: ${stats.totalUniquePorts}`);

        // Create the return object
        const portsByShipload = {};
        if (shiploadsWithPorts.shiploadIds.length > 0) {
            shiploadsWithPorts.shiploadIds.forEach((id, index) => {
                portsByShipload[id.toString()] = shiploadsWithPorts.allPortIds[index];
            });
        }

        return portsByShipload;

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
