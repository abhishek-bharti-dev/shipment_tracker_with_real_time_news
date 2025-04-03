const News = require('../models/News');
const Port = require('../models/Port');
const Incident = require('../models/Incident');
const crypto = require('crypto');

// Create a hash of the news content to check for duplicates
function generateNewsHash(newsData) {
    const contentToHash = `${newsData.title}${newsData.url}${newsData.news_details}`;
    return crypto.createHash('md5').update(contentToHash).digest('hex');
}

// Generate a unique ID for the news
function generateNewsId() {
    return crypto.randomBytes(16).toString('hex');
}

// Process a single news item
async function processNewsItem(newsItem) {
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
        return {
            success: false,
            reason: 'Missing required fields (title, url, or news_details)'
        };
    }
    
    // Generate unique identifiers
    const newsId = generateNewsId();
    const newsHash = generateNewsHash({ title, url, news_details });
    
    // Check if this news already exists
    const existingNews = await News.findOne({ news_hash: newsHash });
    if (existingNews) {
        return {
            success: false,
            reason: 'Duplicate news item'
        };
    }
    
    // Create new news document
    const news = new News({
        news_id: newsId,
        news_hash: newsHash,
        title,
        url,
        news_details,
        published_date,
        news_location
    });
    
    // Save news to database
    await news.save();

    // Process and store port information
    const affectedPorts = newsItem.affected_ports || [];
    const portIds = [];

    for (const portInfo of affectedPorts) {
        if (portInfo.port_name && portInfo.port_code) {
            // Check if port already exists
            let port = await Port.findOne({ port_code: portInfo.port_code });
            
            if (!port) {
                // Create new port if it doesn't exist
                const portId = crypto.randomBytes(16).toString('hex');
                port = new Port({
                    port_id: portId,
                    port_code: portInfo.port_code,
                    port_name: portInfo.port_name,
                    lat_lon: newsItem.incident_location?.geo_coordinates ? 
                        [newsItem.incident_location.geo_coordinates.longitude, 
                         newsItem.incident_location.geo_coordinates.latitude] : 
                        [0, 0] // Default coordinates if not provided
                });
                await port.save();
            }
            
            portIds.push(port.port_id);
        }
    }

    // Create incident record
    const incidentId = crypto.randomBytes(16).toString('hex');
    const incident = new Incident({
        incident_id: incidentId,
        source_news_id: newsId,
        location_type: newsItem.is_sea_port_issue || 'sea',
        affected_port_ids: portIds,
        lat_lon: newsItem.incident_location?.geo_coordinates ? 
            [newsItem.incident_location.geo_coordinates.longitude, 
             newsItem.incident_location.geo_coordinates.latitude] : 
            [0, 0],
        start_time: published_date,
        estimated_duration_days: newsItem.incident_duration || 1,
        severity: newsItem.significance || 5,
        status: 'ongoing'
    });

    await incident.save();
    
    return {
        success: true,
        news_id: newsId,
        incident_id: incidentId,
        title
    };
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
    
    return results;
}

// Get news by ID
async function getNewsById(newsId) {
    return await News.findOne({ news_id: newsId });
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
