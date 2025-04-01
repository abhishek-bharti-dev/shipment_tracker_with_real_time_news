const { fetchGoogleNewsRSS } = require('./scrapper');

async function testScraper() {
    try {
        await fetchGoogleNewsRSS();
        console.log('Scraper test completed successfully');
    } catch (error) {
        console.error('Scraper test failed:', error);
    }
}

testScraper(); 