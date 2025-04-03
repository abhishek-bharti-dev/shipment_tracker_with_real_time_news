const axios = require('axios');

// Sample news data
const newsData = [
  {
    title: "Test News Item",
    url: "https://example.com/test-news",
    news_details: "This is a test news item to verify the news ingestion functionality.",
    published_date: new Date(),
    news_location: "Test Location"
  }
];

// Function to test news ingestion
async function testNewsIngestion() {
  try {
    console.log('Testing news ingestion...');
    const response = await axios.post('http://localhost:3000/api/news/new_incident', newsData);
    console.log('Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error testing news ingestion:', error.response ? error.response.data : error.message);
    return null;
  }
}

// Run the test
testNewsIngestion(); 