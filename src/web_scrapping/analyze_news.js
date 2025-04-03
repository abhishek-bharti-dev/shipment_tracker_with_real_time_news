const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Function to analyze all news links using Gemini API
async function analyzeNewsLinks(links) {
    console.log(links);
    try {
        if (!links || !Array.isArray(links) || links.length === 0) {
            throw new Error('No valid links provided for analysis');
        }

        console.log(`📊 Starting analysis of ${links.length} news articles...`);

        const prompt = `Analyze these news article URLs and identify any shipping incidents. Extract the following information for each incident:

1. News Information:
   - Title of the article
   - URL
   - Publication date
   - News location

2. Incident Location:
   - Name of the location
   - Geographic coordinates (latitude, longitude)

3. Incident Details:
   - Duration in days (if not explicitly mentioned in the article):
     * Consider historical data of similar incidents
     * Factor in the type of incident (e.g., weather, mechanical, labor strike)
     * Account for the scale and complexity of the incident
     * Include time for investigation, repairs, and return to normal operations
     * Consider seasonal factors and current shipping conditions
     * Provide a realistic range if exact duration is uncertain
   - Significance rating (out of 10)
   - Issue Type: Specify whether this is a "sea" or "port" issue
     * For sea issues: Only provide coordinates of the incident location
     * For port issues: Provide both port details and coordinates

4. Affected Ports (CRITICAL - List ALL ports that could be impacted):
   For each incident, carefully analyze and list:
   - All ports in the immediate vicinity of the incident
   - Ports along the affected shipping routes
   - Ports that handle similar cargo or trade routes
   - Ports that serve as alternative routes
   - Major ports in the affected region
   For each port include:
   - Port name
   - Port code (if available)
   - If port code is not available, use "UNKNOWN"

5. Impact Description:
   - Brief description of the impact on shipping operations
   - Include specific mention of which ports are affected and how

Return a JSON object with an array of incidents in this format:
{
    "incidents": [
        {
            "news": {
                "title": "Article Title",
                "url": "Article URL",
                "date": "YYYY-MM-DDTHH:mm:ssZ",
                "news_location": "Location"
            },
            "incident_location": {
                "name": "Location Name",
                "geo_coordinates": {
                    "latitude": 0.0,
                    "longitude": 0.0
                }
            },
            "is_sea_port_issue": "sea",  // or "port"
            "incident_duration": 0,
            "significance": 0,
            "affected_ports": [
                {
                    "port_name": "Port Name",
                    "port_code": "PORTCODE"
                }
            ],
            "impact_description": "Description of impact"
        }
    ]
}

Rules:
1. Return ONLY the JSON object, no additional text
2. Include ALL articles mentioning any shipment-related incidents
3. Use "unknown" for any missing information
4. If no incidents found, return {"incidents": []}
5. Duration should be in days
6. Significance should be rated out of 10
7. For affected_ports:
   - ALWAYS include at least one port if the incident is significant (significance > 5)
   - Include ALL potentially affected ports, not just the most obvious ones
   - Consider both direct and indirect impacts on ports
   - Include ports that might be affected due to rerouting or congestion
   - If port code is unknown, use "UNKNOWN" instead of omitting it
8. The impact_description should clearly explain which ports are affected and why
9. For is_sea_port_issue:
   - Use "sea" for incidents occurring in open waters, shipping lanes, or at sea
   - Use "port" for incidents occurring within port facilities or port areas
   - For sea issues, focus on providing accurate coordinates of the incident location
   - For port issues, provide both port details and coordinates

News article URLs to analyze:
${JSON.stringify(links, null, 2)}`;
        
        console.log('\n🤖 Sending to Gemini API for analysis...');
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        
        // Debug: Log the raw response
        console.log('\n📝 Raw API Response:');
        console.log(text);
        
        try {
            // Try to clean the response if it contains markdown code blocks
            let cleanText = text;
            if (text.startsWith('```json')) {
                cleanText = text.replace('```json', '').replace('```', '').trim();
            }
            
            const analysis = JSON.parse(cleanText);
            const incidents = analysis.incidents || [];

            // Create data directory if it doesn't exist
            const dataDir = path.join(__dirname, '../../data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Save incidents to file
            const outputPath = path.join(dataDir, 'shipment_incidents.json');
            fs.writeFileSync(outputPath, JSON.stringify(incidents, null, 2));

            console.log(`\n📊 Analysis Complete:`);
            console.log(`   • Total articles analyzed: ${links.length}`);
            console.log(`   • Incidents detected: ${incidents.length}`);
            console.log(`✅ Incidents saved to shipment_incidents.json`);

            return {
                totalArticles: links.length,
                incidentsDetected: incidents.length,
                incidents
            };
        } catch (parseError) {
            console.error('\n❌ Error parsing Gemini response:');
            console.error('Response text:', text);
            console.error('Parse error:', parseError);
            throw new Error('Failed to parse API response');
        }
    } catch (error) {
        console.error('❌ Error analyzing news links:', error.message);
        throw error;
    }
}

// Export the function
module.exports = {
    analyzeNewsLinks
};

// Only run if this file is executed directly
if (require.main === module) {
    console.time('Analysis Time');
    // Read links from file if running directly
    const dataDir = path.join(__dirname, '../../data');
    const linksPath = path.join(dataDir, 'news_links.json');
    const links = JSON.parse(fs.readFileSync(linksPath, 'utf-8'));
    
    analyzeNewsLinks(links).then(() => {
        console.timeEnd('Analysis Time');
    }).catch(error => {
        console.error('❌ Analysis failed:', error);
    });
}