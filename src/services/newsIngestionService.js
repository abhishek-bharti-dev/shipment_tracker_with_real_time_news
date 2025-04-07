const News = require('../models/News');
const Port = require('../models/Port');
const Incident = require('../models/Incident');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Create a hash of the news content to check for duplicates
function generateNewsHash(newsData) {
    const contentToHash = `${newsData.title}${newsData.url}${newsData.news_details}`;
    return crypto.createHash('md5').update(contentToHash).digest('hex');
}

// Process a single news item
async function processNewsItem(newsItem) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        // Extract required fields from the nested structure
        const title = newsItem.news?.title;
        const url = newsItem.news?.url;
        const news_details = newsItem.impact_description || '';
        
        // Handle the published_date field properly
        let published_date = new Date(); // Default to current date
        if (newsItem.news?.date && newsItem.news.date !== "unknown") {
            try {
                published_date = new Date(newsItem.news.date);
                // Check if the date is valid
                if (isNaN(published_date.getTime())) {
                    published_date = new Date(); // Reset to current date if invalid
                }
            } catch (error) {
                console.log(`Invalid date format: ${newsItem.news.date}, using current date instead`);
            }
        }
        
        const news_location = newsItem.news?.news_location || newsItem.incident_location?.name || 'Unknown';
        
        // Validate required fields
        if (!title || !url || !news_details) {
            await session.abortTransaction();
            return {
                success: false,
                reason: 'Missing required fields (title, url, or news_details)'
            };
        }
        
        // Generate hash for duplicate checking
        const newsHash = generateNewsHash({ title, url, news_details });
        
        // Check if this news already exists
        const existingNews = await News.findOne({ news_hash: newsHash }).session(session);
        if (existingNews) {
            await session.abortTransaction();
            return {
                success: false,
                reason: 'Duplicate news item'
            };
        }
        
        // Create new news document
        const news = new News({
            news_hash: newsHash,
            title,
            url,
            news_details,
            published_date,
            news_location
        });
        
        // Save news to database
        await news.save({ session });

        // Process and store port information
        const affectedPorts = newsItem.affected_ports || [];
        const portIds = [];

        // Handle coordinates based on location type
        let coordinates = null;
        if (newsItem.incident_location?.geo_coordinates) {
            const lat = newsItem.incident_location.geo_coordinates.latitude;
            const lon = newsItem.incident_location.geo_coordinates.longitude;
            
            // Only set coordinates if both values are valid numbers
            if (lat !== "unknown" && lon !== "unknown" && 
                !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon))) {
                coordinates = [
                    parseFloat(lon),
                    parseFloat(lat)
                ];
            }
        }

        for (const portInfo of affectedPorts) {
            if (portInfo.port_name && portInfo.port_code) {
                // Check if port already exists
                let port = await Port.findOne({ port_code: portInfo.port_code }).session(session);
                
                if (!port) {
                    // Create new port if it doesn't exist
                    port = new Port({
                        port_code: portInfo.port_code,
                        port_name: portInfo.port_name,
                        lat_lon: coordinates || [] // Use empty array if coordinates are null
                    });
                    await port.save({ session });
                }
                
                portIds.push(port._id);
            }
        }

        // Create incident record
        // Validate coordinates for sea incidents
        if (newsItem.is_sea_port_issue === 'sea' && (!coordinates || coordinates.length === 0)) {
            await session.abortTransaction();
            return {
                success: false,
                reason: 'Coordinates are required for sea incidents'
            };
        }
        
        const incident = new Incident({
            source_news: news._id,
            location_type: newsItem.is_sea_port_issue || 'sea',
            affected_ports: portIds,
            lat_lon: coordinates || [], // Use empty array if coordinates are null
            start_time: published_date,
            estimated_duration_days: newsItem.incident_duration || 1,
            severity: newsItem.significance || 5,
            status: 'ongoing'
        });

        await incident.save({ session });
        
        // If everything is successful, commit the transaction
        await session.commitTransaction();
        
        return {
            success: true,
            news_id: news._id,
            incident_id: incident._id,
            title
        };
    } catch (error) {
        // If any error occurs, abort the transaction
        await session.abortTransaction();
        return {
            success: false,
            reason: error.message
        };
    } finally {
        // Always end the session
        session.endSession();
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
