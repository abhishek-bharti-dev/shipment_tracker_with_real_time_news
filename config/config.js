module.exports = {
  port: process.env.PORT || 3000,
  newsApiKey: process.env.NEWS_API_KEY,
  newsUpdateInterval: 5 * 60 * 1000, // 5 minutes in milliseconds
  database: {
    url: process.env.DATABASE_URL || 'mongodb://localhost:27017/shipment_tracker'
  }
}; 