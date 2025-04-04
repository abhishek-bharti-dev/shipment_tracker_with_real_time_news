const mongoose = require('mongoose');
const crypto = require('crypto');
const Delay = require('../models/Delay');
const Incident = require('../models/Incident');
const VesselTracking = require('../models/VesselTracking');
const Port = require('../models/Port');
const News = require('../models/News');

// Function to generate news hash
function generateNewsHash(newsData) {
    const contentToHash = `${newsData.title}${newsData.url}${newsData.news_details}`;
    return crypto.createHash('md5').update(contentToHash).digest('hex');
}

// Sample port data
const ports = [
    { port_code: 'SGSIN', port_name: 'Singapore' },
    { port_code: 'CNTAO', port_name: 'Qingdao' },
    { port_code: 'USLAX', port_name: 'Los Angeles' },
    { port_code: 'DEHAM', port_name: 'Hamburg' },
    { port_code: 'JPTYO', port_name: 'Tokyo' }
];

// Sample news data
const newsItems = [
    {
        title: 'Port Congestion in Singapore',
        url: 'https://example.com/singapore-congestion',
        news_details: 'Heavy congestion reported at Singapore port',
        published_date: new Date(),
        news_location: 'Singapore'
    },
    {
        title: 'Storm Warning in Pacific Ocean',
        url: 'https://example.com/pacific-storm',
        news_details: 'Severe storm warning issued for Pacific shipping routes',
        published_date: new Date(),
        news_location: 'Pacific Ocean'
    },
    {
        title: 'Labor Strike in Los Angeles',
        url: 'https://example.com/la-strike',
        news_details: 'Port workers on strike in Los Angeles',
        published_date: new Date(),
        news_location: 'Los Angeles'
    }
].map(news => ({
    ...news,
    news_hash: generateNewsHash(news)
}));

async function populateData() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb+srv://abhishek:1234@cluster0.xyyvvsu.mongodb.net/shipment_tracker?retryWrites=true&w=majority&appName=Cluster0/shipment_tracker');

        // Create ports
        const createdPorts = await Port.insertMany(ports);
        console.log('Created ports:', createdPorts.length);

        // Create news items
        const createdNews = await News.insertMany(newsItems);
        console.log('Created news items:', createdNews.length);

        // Create incidents with news references
        const incidents = [
            {
                source_news: createdNews[0]._id,
                location_type: 'port',
                start_time: new Date(),
                estimated_duration_days: 3,
                severity: 7,
                status: 'ongoing'
            },
            {
                source_news: createdNews[1]._id,
                location_type: 'sea',
                start_time: new Date(),
                estimated_duration_days: 5,
                severity: 8,
                status: 'ongoing'
            },
            {
                source_news: createdNews[2]._id,
                location_type: 'port',
                start_time: new Date(),
                estimated_duration_days: 2,
                severity: 5,
                status: 'ongoing'
            }
        ];

        const createdIncidents = await Incident.insertMany(incidents);
        console.log('Created incidents:', createdIncidents.length);

        // Shipment IDs
        const shipmentIds = [
            '5d7f34819792970001d9eaf6',
            '5d7f485efb2bd1000164a3f5',
            '5d7f48e4fb2bd1000164a3fa',
            '5d7f4968fb2bd1000164a408'
        ];

        // Create delays
        const delays = [
            // Multiple delays for first shipment
            {
                shipment: shipmentIds[0],
                port: createdPorts[0]._id,
                expected_delay_days: 3,
                incident: createdIncidents[0]._id
            },
            {
                shipment: shipmentIds[0],
                port: createdPorts[1]._id,
                expected_delay_days: 2,
                incident: createdIncidents[1]._id
            },
            // Single delay for second shipment
            {
                shipment: shipmentIds[1],
                port: createdPorts[2]._id,
                expected_delay_days: 4,
                incident: createdIncidents[2]._id
            },
            // Multiple delays for third shipment
            {
                shipment: shipmentIds[2],
                port: createdPorts[3]._id,
                expected_delay_days: 2,
                incident: createdIncidents[0]._id
            },
            {
                shipment: shipmentIds[2],
                port: createdPorts[4]._id,
                expected_delay_days: 3,
                incident: createdIncidents[1]._id
            },
            // Single delay for fourth shipment
            {
                shipment: shipmentIds[3],
                port: createdPorts[0]._id,
                expected_delay_days: 5,
                incident: createdIncidents[2]._id
            }
        ];

        const createdDelays = await Delay.insertMany(delays);
        console.log('Created delays:', createdDelays.length);

        console.log('Data population completed successfully!');
    } catch (error) {
        console.error('Error populating data:', error);
    } finally {
        await mongoose.disconnect();
    }
}

populateData(); 