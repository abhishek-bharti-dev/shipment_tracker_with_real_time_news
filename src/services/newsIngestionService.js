const News = require('../models/News');
const Port = require('../models/Port');
const Incident = require('../models/Incident');
const crypto = require('crypto');
const mongoose = require('mongoose');
const imageExtractionService = require('./imageExtractionService');
const geminiApi = require('./geminiApi');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URI3)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Create a hash of the news content to check for duplicates
function generateNewsHash(newsData) {
    const contentToHash = `${newsData.title}${newsData.url}${newsData.news_details}`;
    return crypto.createHash('md5').update(contentToHash).digest('hex');
}
function calculateFinalDelay(min, max, mostLikely,  confidence, severity) {
    const pert = (min + 4 * mostLikely + max) / 6;
    const weighted = pert * confidence * (1 + severity / 10);
    return Math.ceil(weighted);
  }
// Process a single news item
async function processNewsItem(newsItem) {
    try {
        // Extract required fields from the new structure
        const title = newsItem.news_details?.title;
        const url = newsItem.news_details?.url;
        const news_details = newsItem.news_details?.full_summary || '';
        const summary = newsItem.news_details?.short_summary || '';
        
        // Handle the published_date field properly
        let published_date = new Date(); // Default to current date
        if (newsItem.news_details?.date) {
            try {
                published_date = new Date(newsItem.news_details.date);
                // Check if the date is valid
                if (isNaN(published_date.getTime())) {
                    published_date = new Date(); // Reset to current date if invalid
                }
            } catch (error) {
                console.log(`Invalid date format: ${newsItem.news_details.date}, using current date instead`);
            }
        }
        
        const news_location = newsItem.incident_location?.name || 'Unknown';
        
        // Validate required fields
        if (!title || !url || !news_details) {
            return {
                success: false,
                reason: 'Missing required fields (title, url, or news_details)'
            };
        }
        
        // Generate hash for duplicate checking
        const newsHash = generateNewsHash({ title, url, news_details });
        
        // Check if this news already exists
        const existingNews = await News.findOne({ news_hash: newsHash });
        if (existingNews) {
            return {
                success: false,
                reason: 'Duplicate news item'
            };
        }

        // Extract image from the article
        let image = null;
        try {
            const imageResult = await imageExtractionService.extractImageFromArticle(url);
            if (imageResult.imageUrl) {
                image = imageResult.imageUrl;
            }
        } catch (error) {
            console.error('Error extracting image:', error);
        }

        // Create new news document
        const news = new News({
            news_hash: newsHash,
            title,
            url,
            news_details,
            published_date,
            news_location,
            image,
            summary
        });
        
        // Save news to database
        await news.save();

        // Process and store port information
        const portIds = [];
        const locationData = newsItem.location_data || {};
        const ports = locationData.ports || [];

        // Handle coordinates based on incident location
        let coordinates = null;
        if (newsItem.incident_location?.coordinates) {
            const lat = newsItem.incident_location.coordinates.latitude;
            const lon = newsItem.incident_location.coordinates.longitude;
            
            if (!isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon))) {
                coordinates = [
                    parseFloat(lon),
                    parseFloat(lat)
                ];
            }
        }

        for (const portInfo of ports) {
            if (portInfo.name && portInfo.code) {
                // Check if port already exists
                let port = await Port.findOne({ port_code: portInfo.code });
                
                if (!port) {
                    // Create new port if it doesn't exist
                    port = new Port({
                        port_code: portInfo.code,
                        port_name: portInfo.name,
                        lat_lon: portInfo.coordinates ? [
                            parseFloat(portInfo.coordinates.longitude),
                            parseFloat(portInfo.coordinates.latitude)
                        ] : []
                    });
                    await port.save();
                }
                
                portIds.push(port._id);
            }
        }

        // Process delay prediction
        const delayPrediction = newsItem.delay_prediction || {};
        const estimated_duration_days = calculateFinalDelay(delayPrediction.minimum_days, delayPrediction.maximum_days, delayPrediction.most_likely_days, delayPrediction.confidence_score, delayPrediction.severity_score) || 1;
        // console.log(estimated_duration_days);
        const severity = delayPrediction.severity_score || 5;
        const confidence_score = delayPrediction.confidence_score || 0.5;
        const location_type = newsItem.incident_type || 'port';
        // Create incident record
        const incident = new Incident({
            source_news: news._id,
            location_type: location_type,
            affected_ports: portIds,
            lat_lon: coordinates || [],
            start_time: published_date,
            estimated_duration_days,
            severity,
            confidence_score,
            status: 'ongoing',
            delay_prediction: {
                minimum_days: delayPrediction.minimum_days,
                maximum_days: delayPrediction.maximum_days,
                most_likely_days: delayPrediction.most_likely_days,
                confidence_score: delayPrediction.confidence_score
            }
        });

        await incident.save();
        
        return {
            success: true,
            news_id: news._id,
            incident_id: incident._id,
            title
        };
    } catch (error) {
        return {
            success: false,
            reason: error.message
        };
    }
}

// Process multiple news items
async function processNewsItems(newsItems) {
    const results = {
        success: [],
        failed: []
    };
    
    for (const newsItem of newsItems) {
        try {
            const result = await processNewsItem(newsItem);
            
            if (result.success) {
                results.success.push({
                    news_id: result.news_id,
                    title: result.title
                });
            } else {
                results.failed.push({
                    item: newsItem,
                    reason: result.reason
                });
            }
        } catch (error) {
            results.failed.push({
                item: newsItem,
                reason: error.message
            });
        }
    }
    console.log(results);
    
    return results;
}

// Get news by ID
async function getNewsById(newsId) {
    return await News.findById(newsId);
}

// Get all news
async function getAllNews() {
    return await News.find({}).sort({ published_date: -1 });
}

module.exports = {
    processNewsItems,
    getNewsById,
    getAllNews
};


if (require.main === module) {
    const response = require('../../data/shipment_incidents.json');
    processNewsItems(response).then((response) => {
        console.log(response);
        mongoose.connection.close();
        console.log('MongoDB connection closed');
    }).catch(error => {
        console.error('❌ Analysis failed:', error);
        mongoose.connection.close();
        console.log('MongoDB connection closed');
    });
}