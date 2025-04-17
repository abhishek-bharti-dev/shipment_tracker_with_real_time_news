const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection configuration
const MONGODB_URI = process.env.DATABASE_URI3 || 'mongodb://192.168.0.107:27017/shipment_tracker';
const MONGODB_OPTIONS = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
};

// Connect to MongoDB with retry logic
async function connectWithRetry(retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            await mongoose.connect(MONGODB_URI, MONGODB_OPTIONS);
            console.log('Connected to MongoDB');
            return;
        } catch (err) {
            if (i === retries - 1) throw err;
            console.log(`Connection attempt ${i + 1} failed. Retrying...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

// Function to get shipload events port details
async function getShiploadEventsPorts() {
    let connection;
    try {
        await connectWithRetry();
        connection = mongoose.connection;

        // Define minimal schema just for events
        const shiploadSchema = new mongoose.Schema({
            events: Object
        }, { 
            collection: 'gocomet_shiploads'
        });

        // Register the model
        const Shipload = mongoose.model('Shipload', shiploadSchema);
        
        // Use the hardcoded ID and convert to ObjectId
        const shiploadId = new mongoose.Types.ObjectId('67ff9d5ec408a321a1fb675a');
        
        // Only select the events field
        const shipload = await Shipload.findById(shiploadId)
            .select('events')
            .lean();

        if (!shipload) {
            console.log('No shipload found with ID:', shiploadId);
            return null;
        }

        // Extract and print port details from events in numerical order
        if (shipload.events) {
            console.log('Port Details in Events (Sorted Numerically):');
            
            // Convert events object to array of [key, value] pairs and sort numerically
            const sortedEvents = Object.entries(shipload.events)
                .sort((a, b) => {
                    // Convert event numbers to float for proper numerical sorting
                    const aNum = parseFloat(a[0]);
                    const bNum = parseFloat(b[0]);
                    return aNum - bNum;
                });

            // Process each event in sorted order
            sortedEvents.forEach(([eventKey, event]) => {
                if (event && event.port) {
                    console.log(`\nEvent ${eventKey}:`);
                    console.log('Port ID:', event.port.id || 'N/A');
                    console.log('Port Name:', event.port.display_name || 'N/A');
                }
            });
        } else {
            console.log('No events found for this shipload');
        }

        return shipload.events;
    } catch (error) {
        console.error('Error in getShiploadEventsPorts:', error.message);
        throw error;
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('MongoDB connection closed');
            } catch (err) {
                console.error('Error closing MongoDB connection:', err.message);
            }
        }
    }
}

// Run the script
if (require.main === module) {
    (async () => {
        try {
            await getShiploadEventsPorts();
            process.exit(0);
        } catch (error) {
            console.error('Script execution failed:', error.message);
            process.exit(1);
        }
    })();
} 