const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const keywordsFile = path.join(__dirname, 'keywords.txt'); // Path to keywords

// Function to Fetch Google News RSS
async function fetchGoogleNewsRSS() {
    try {
        // Read Keywords from File
        const keywords = fs.readFileSync(keywordsFile, 'utf-8').split('\n').map(k => k.trim()).filter(k => k);
        
        // Generate RSS URLs for all keywords
        const urls = keywords.map(k => `https://news.google.com/rss/search?q=${encodeURIComponent(k)}%20when%3A1h&hl=en-IN&gl=IN&ceid=IN%3Aen`);

        let allLinks = [];
        let totalLinks = 0;

        for (const url of urls) {
            console.log(`🔍 Fetching news from: ${url}`);
            const response = await axios.get(url);
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(response.data);
            
            const items = result.rss.channel[0].item || [];
            const links = items.map(item => item.link[0]);

            totalLinks += links.length;
            allLinks = allLinks.concat(links);
        }

        // Create Data Directory if it Doesn't Exist
        const dataDir = path.join(__dirname, '../../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Write Links to JSON File
        const outputPath = path.join(dataDir, 'news_links.json');
        fs.writeFileSync(outputPath, JSON.stringify(allLinks, null, 2));

        console.log(`📊 News Statistics:`);
        console.log(`   • Total links fetched: ${totalLinks}`);
        console.log(`✅ Successfully stored news links in news_links.json`);
        
        return {
            totalLinks,
            links: allLinks
        };
    } catch (error) {
        console.error('❌ Error fetching Google News RSS:', error.message);
        throw error;
    }
}

// Export the function
module.exports = {
    fetchGoogleNewsRSS
};

// Only run if this file is executed directly
if (require.main === module) {
    // Measure execution time
    const startTime = Date.now();
    // run the script
    fetchGoogleNewsRSS().then(() => {
        const endTime = Date.now();
        const executionTime = (endTime - startTime) / 1000; // Convert to seconds
        console.log(`⏱️ Script Execution Time: ${executionTime.toFixed(2)} seconds`);
    }).catch(error => {
        console.error('❌ Script failed:', error);
    });
}