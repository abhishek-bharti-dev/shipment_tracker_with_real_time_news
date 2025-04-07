const newsIngestionService = require('../services/newsIngestionService');

async function handleCreateNewsIngestion(req, res) {
    try {
        // console.log('Received news ingestion request:', req.body);
        
        // Validate request body
        if (!req.body || !Array.isArray(req.body)) {
            return res.status(400).json({ 
                success: false,
                data: null,
                message: 'Invalid request format. Expected an array of news items.' 
            });
        }
        
        // Process news items using the service
        const results = await newsIngestionService.processNewsItems(req.body);
        
        // Return results
        return res.status(200).json({
            success: true,
            data: results,
            message: `Processed ${results.success.length} news items successfully, ${results.failed.length} failed`
        });
        
    } catch (error) {
        console.error('Error in news ingestion:', error);
        return res.status(500).json({
            success: false,
            data: null,
            message: 'Internal server error during news ingestion'
        });
    }
}

async function handleGetNewsById(req, res) {
    try {
        const newsId = req.params.newsId;
        const news = await newsIngestionService.getNewsById(newsId);
        
        if (!news) {
            return res.status(404).json({
                success: false,
                data: null,
                message: 'News item not found'
            });
        }
        
        return res.status(200).json({
            success: true,
            data: news,
            message: 'News item retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching news:', error);
        return res.status(500).json({
            success: false,
            data: null,
            message: 'Internal server error while fetching news'
        });
    }
}

async function handleGetAllNews(req, res) {
    try {
        const news = await newsIngestionService.getAllNews();
        
        return res.status(200).json({
            success: true,
            data: {
                count: news.length,
                news: news
            },
            message: 'All news items retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching all news:', error);
        return res.status(500).json({
            success: false,
            data: null,
            message: 'Internal server error while fetching all news'
        });
    }
}

module.exports = {
    handleCreateNewsIngestion,
    handleGetNewsById,
    handleGetAllNews
};