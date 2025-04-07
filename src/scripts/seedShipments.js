const mongoose = require('mongoose');
const Shipment = require('../models/Shipment');
const VesselTracking = require('../models/VesselTracking');

const vesselData = [
  {
    _id: '67eeece1501f721c7f281374',
    vessel_name: 'MSC Gaia',
    vessel_code: 'MSG001',
    source: 'Singapore',
    destination: 'Hong Kong',
    lat_lon: [1.3521, 103.8198], // Singapore coordinates
    events: [
      {
        port_code: 'SGSIN',
        port_name: 'Port of Singapore',
        event_type: 'arrival',
        timestamp: new Date(),
        expected_time_of_arrival: new Date(),
        coordinates: [1.3521, 103.8198]
      }
    ]
  },
  {
    _id: '67eeece1501f721c7f281377',
    vessel_name: 'Maersk Sealand',
    vessel_code: 'MSL002',
    source: 'Hong Kong',
    destination: 'Shanghai',
    lat_lon: [22.3193, 114.1694], // Hong Kong coordinates
    events: [
      {
        port_code: 'HKHKG',
        port_name: 'Port of Hong Kong',
        event_type: 'arrival',
        timestamp: new Date(),
        expected_time_of_arrival: new Date(),
        coordinates: [22.3193, 114.1694]
      }
    ]
  },
  {
    _id: '67eeece1501f721c7f28137a',
    vessel_name: 'COSCO Pacific',
    vessel_code: 'COP003',
    source: 'Shanghai',
    destination: 'New York',
    lat_lon: [31.2304, 121.4737], // Shanghai coordinates
    events: [
      {
        port_code: 'CNSHA',
        port_name: 'Port of Shanghai',
        event_type: 'arrival',
        timestamp: new Date(),
        expected_time_of_arrival: new Date(),
        coordinates: [31.2304, 121.4737]
      }
    ]
  },
  {
    _id: '67eeece1501f721c7f28137d',
    vessel_name: 'Evergreen Marine',
    vessel_code: 'EGM004',
    source: 'New York',
    destination: 'Hamburg',
    lat_lon: [40.7128, -74.0060], // New York coordinates
    events: [
      {
        port_code: 'USNYC',
        port_name: 'Port of New York',
        event_type: 'arrival',
        timestamp: new Date(),
        expected_time_of_arrival: new Date(),
        coordinates: [40.7128, -74.0060]
      }
    ]
  },
  {
    _id: '67eeece1501f721c7f281380',
    vessel_name: 'Hapag-Lloyd Express',
    vessel_code: 'HLE005',
    source: 'Hamburg',
    destination: 'Singapore',
    lat_lon: [53.5511, 9.9937], // Hamburg coordinates
    events: [
      {
        port_code: 'DEHAM',
        port_name: 'Port of Hamburg',
        event_type: 'arrival',
        timestamp: new Date(),
        expected_time_of_arrival: new Date(),
        coordinates: [53.5511, 9.9937]
      }
    ]
  }
];

async function seedVessels() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect("mongodb+srv://abhishek:1234@cluster0.xyyvvsu.mongodb.net/shipment_tracker?retryWrites=true&w=majority&appName=Cluster0");
    console.log('Connected to MongoDB');

    // Delete existing vessels with these IDs
    const idsToDelete = vesselData.map(vessel => vessel._id);
    await VesselTracking.deleteMany({ _id: { $in: idsToDelete } });
    console.log('Deleted existing vessels');

    // Insert new vessels
    await VesselTracking.insertMany(vesselData);
    console.log('Successfully inserted vessels:');
    vesselData.forEach(vessel => {
      console.log(`- ${vessel.vessel_name} (${vessel.vessel_code})`);
    });

  } catch (error) {
    console.error('Error seeding vessels:', error.message);
  }
}

async function seedShipments() {
  try {
    // Get all vessels from VesselTracking
    const vessels = await VesselTracking.find({});
    console.log(`Found ${vessels.length} vessels to create shipments for`);

    // Delete existing shipments for these vessels
    const vesselIds = vessels.map(vessel => vessel._id);
    await Shipment.deleteMany({ tracking_id: { $in: vesselIds } });
    console.log('Deleted existing shipments for these vessels');

    // Generate unique timestamp-based IDs
    const timestamp = Date.now();
    const shipments = vessels.map((vessel, index) => ({
      shipment_id: `SHIP${timestamp}${String(index + 1).padStart(4, '0')}`,
      client_id: new mongoose.Types.ObjectId(),
      tracking_id: vessel._id,
      cargo_type: ['Container', 'Bulk', 'Liquid', 'General Cargo'][Math.floor(Math.random() * 4)],
      POL: vessel.source,
      POD: vessel.destination
    }));

    // Insert shipments
    const insertedShipments = await Shipment.insertMany(shipments);
    console.log('Successfully inserted shipments:');
    insertedShipments.forEach(shipment => {
      console.log(`- Shipment ID: ${shipment.shipment_id}, Tracking ID: ${shipment.tracking_id}`);
    });

  } catch (error) {
    console.error('Error seeding shipment data:', error);
  }
}

async function main() {
  try {
    await mongoose.connect("mongodb+srv://abhishek:1234@cluster0.xyyvvsu.mongodb.net/shipment_tracker?retryWrites=true&w=majority&appName=Cluster0");
    
    await seedVessels();
    await seedShipments();
    
    console.log('\nAll seeding completed successfully');
  } catch (error) {
    console.error('Error in main:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
}

main(); 