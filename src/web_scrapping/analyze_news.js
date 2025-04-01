const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Function to analyze all news links using Gemini API
async function analyzeNewsLinks() {
    try {
        // Read news links from file
        const dataDir = path.join(__dirname, '../../data');
        const linksPath = path.join(dataDir, 'news_links.json');
        const links = JSON.parse(fs.readFileSync(linksPath, 'utf-8'));

        console.log(`📊 Starting analysis of ${links.length} news articles...`);

        const prompt = `Analyze these news article URLs and identify any shipping incidents. Extract the following information for each incident:

1. Affected Port(s):
   - Port name
   - Location (city/region/country)
   - Coordinates (latitude, longitude)

2. Disruption Details:
   - Type: port_closure, weather, accident, strike, geopolitical, other
   - Cause: specific reason (e.g., labor strike, flooding, typhoon)
   - start date: start date of disruption
   - end date: expected end date
   - Duration: possibel duration of disruption
   - Significance: minor, moderate, or severe

3. Impact Information:
   - Affected Area: broader region or trade route
   - Date: when incident occurred/reported
   - Operational Impact: waiting times, canceled sailings, rerouting
   - Ships Affected: number and types of vessels
   - Cargo Impacted: specific goods or industries
   - Port Status: current operational status

Return a JSON object with an array of incidents in this format:
{
    "incidents": [
        {
            "isIncident": true,
            "port": {
                "name": "Port Name",
                "location": "City/Region/Country",
                "coordinates": "Latitude, Longitude"
            },
            "disruption": {
                "type": "port_closure/weather/accident/strike/geopolitical/other",
                "cause": "Specific reason for disruption",
                "startDate": "YYYY-MM-DD",
                "endDate": "YYYY-MM-DD",
                "duration": "Possible duration of disruption",
                "significance": "minor/moderate/severe"
            },
            "severity": "Provide me data out of 10",
            "impact": {
                "area": "Affected region or trade route",
                "date": {
                    "occurred": "YYYY-MM-DD",
                    "reported": "YYYY-MM-DD"
                },
                "operations": {
                    "status": "Current port status",
                    "waitingTimes": "Average waiting time",
                    "canceledSailings": "Number of canceled sailings",
                    "rerouting": "Rerouting information if any"
                },
                "ships": {
                    "count": "Number of affected ships",
                    "types": ["Container Ships", "Bulk Carriers", etc.]
                },
                "cargo": ["Electronics", "Perishables", etc.]
            },
            "url": "Article URL"
        }
    ]
}

Rules:
1. Return ONLY the JSON object, no additional text
2. Include ALL articles mentioning any shipment-related incidents
3. Set isIncident to true for any article mentioning port issues, shipping delays, or cargo problems
4. Use "unknown" for any missing information
5. If no incidents found, return {"incidents": []}

News article URLs to analyze:
${JSON.stringify(links, null, 2)}`;
        
        console.log(prompt);
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
    analyzeNewsLinks().then(() => {
        console.timeEnd('Analysis Time');
    }).catch(error => {
        console.error('❌ Analysis failed:', error);
    });
}