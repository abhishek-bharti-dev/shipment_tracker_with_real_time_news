const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const processNewsItem = require('../services/newsIngestionService');
const delayService = require('../services/delayService');
const eventEmitter = require('../services/eventEmitter');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Set up event listener for delay processing
eventEmitter.on('processDelays', async () => {
    try {
        console.log('\n🔄 Processing delay incidents asynchronously...');
        const delayResults = await delayService.processUnupdatedDelayIncidents();
        console.log('Delay processing results:', delayResults);
    } catch (error) {
        console.error('Error processing delays:', error);
    }
});

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
                    "port_code": "PORTCODE",
                    "geo_coordinates": {
                    "latitude": 0.0,
                    "longitude": 0.0
                }
                }
            ],
            "impact_description": "Description of impact"
        }
}

Rules:
1. Return ONLY the JSON object, no additional text
2. Include ALL articles mentioning any shipment-related incidents
3. Use "unknown" for any missing information
4. If no incidents found, return {{}}
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

            // Save incidents to file without the outer wrapper
            const outputPath = path.join(dataDir, 'shipment_incidents.json');
            fs.writeFileSync(outputPath, JSON.stringify(incidents, null, 2));

            console.log(`\n📊 Analysis Complete:`);
            console.log(`   • Total articles analyzed: ${links.length}`);
            console.log(`   • Incidents detected: ${incidents.length}`);
            console.log(`✅ Incidents saved to shipment_incidents.json`);
            
            //process the incidents
            await processNewsItem.processNewsItems(incidents);
            
            // Emit event for asynchronous delay processing
            eventEmitter.emit('processDelays');

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

class NewsAnalyzer {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });
        this.dataDir = path.join(__dirname, '../../data');
    }

    async getReleventLinks(links) {
        console.log(links);
        console.log("Starting Phase 1: Getting Relevent Links ----------")
        const prompt = `
        You are a logistics and supply chain expert. I will give you a list of news article URLs. Your job is to analyze the **content of each article** and **identify only those links** that report events or incidents that could potentially cause **shipment delays** — either at the port, in transit, or due to external disruptions.

        Only include links that involve:
        - Port congestion
        - Strikes (port workers, customs, transport)
        - Vessel delays
        - Bad weather affecting shipping
        - Geopolitical tensions or sanctions
        - Accidents or natural disasters
        - Regulatory or tariff-related issues
        - Fuel shortage or rerouting issues
        - Infrastructure breakdowns (bridges, port cranes, runways, etc.)

        Return a **filtered list of URLs** that are relevant for delay prediction.

        Here's the list of links:
        ${JSON.stringify(links, null, 2)}

        Return format:
        {
        "relevant_links": [
            "https://example.com/article-1",
            "https://example.com/article-3"
        ]
        }
        `
        console.log('\n🤖 Sending to Gemini API for analysis...');
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        
        // Strip markdown block if present
        let jsonText = text;
        if (text.startsWith("```")) {
            jsonText = text.replace(/```json|```/g, '').trim();
        }
        
        try {
            const parsedResponse = JSON.parse(jsonText);
            console.log("Phase 1 Completed ----------");
            return parsedResponse.relevant_links;
        } catch (error) {
            console.error("Error parsing Gemini response:", error);
            console.error("Raw response:", text);
            throw new Error("Failed to parse Gemini API response as JSON");
        }
    }

    async fakeNewsDetection(links) {
        console.log("Starting Fake News Detection ----------");
        const prompt = `
        You are a news verification expert. I will give you a list of news article URLs. Your task is to analyze each article and determine if it might be fake news by checking for similar news articles.

        For each article, analyze:
        1. The main claims and facts presented
        2. The sources cited
        3. The publication date
        4. The credibility of the source

        Return a JSON object with the following structure:
        {
            "analysis": [
                {
                    "url": "article_url",
                    "title": "article_title",
                    "is_potential_fake_news": true/false,
                    "similar_articles_count": number,
                    "reasoning": "explanation of why it might be fake news",
                    "similar_articles": [
                        {
                            "url": "similar_article_url",
                            "title": "similar_article_title",
                            "publication_date": "YYYY-MM-DD"
                        }
                    ]
                }
            ]
        }

        Rules:
        1. Mark an article as potential fake news if:
           - There are more than 5 similar articles with conflicting information
           - The source is known for spreading misinformation
           - The claims are extraordinary without credible evidence
        2. Include at least 3 similar articles in the response
        3. If no similar articles are found, set similar_articles_count to 0
        4. Return "unknown" for any missing information

        Here's the list of links to analyze:
        ${JSON.stringify(links, null, 2)}
        `;

        console.log('\n🤖 Sending to Gemini API for fake news analysis...');
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        
        // Strip markdown block if present
        let jsonText = text;
        if (text.startsWith("```")) {
            jsonText = text.replace(/```json|```/g, '').trim();
        }
        
        try {
            const parsedResponse = JSON.parse(jsonText);
            console.log("Fake News Detection Completed ----------");
            return parsedResponse.analysis;
        } catch (error) {
            console.error("Error parsing Gemini response:", error);
            console.error("Raw response:", text);
            throw new Error("Failed to parse Gemini API response as JSON");
        }
    }

    async extractNewsDetails(link){
        console.log("Starting News Details Extraction ----------");
        const prompt = `
        You are a logistics and supply chain expert. I will give you a news article URL. Your task is to analyze the article and extract the following information:

        - Title of the article
        - Publication date (MUST be in ISO format: YYYY-MM-DDTHH:mm:ssZ)
        - News location
        - Full news summary
        - Short summary (3-4 words)
        - Historical references (similar past incidents)
        - Factors considered (what factors might affect the incident)

        Return a JSON object with the following structure:
        {
            "news_details": {
                "title": "Article Title",
                "url": "Article URL",
                "date": "YYYY-MM-DDTHH:mm:ssZ",
                "news_location": "Location",
                "full_summary": "Complete news summary",
                "short_summary": "3-4 word summary",
                "historical_references": [
                    {
                        "similar_incident": "description",
                        "actual_delay": "delay_in_days",
                        "source": "source_url"
                        }
                ],
                "factors_considered": [
                    "factor1",
                    "factor2"
                ]
            }
        }       
        Rules:
        1. Return ONLY the JSON object, no additional text
        2. If any critical information in the news is missing or marked as "Unknown" (such as port names, coordinates, or specific sea regions), perform a contextual web search using keywords from the article (e.g., "ports affected by [event]" or "shipping delays in [region]") to infer and fill in the missing data.
        When references are made to broad terms like "Multiple Ports in the Mediterranean and Asia," do not leave the ports unspecified. Instead, identify a representative list of likely affected ports based on:
        Geographic relevance to the incident
        Known trade hubs or choke points in the region
        Historical incidents of similar nature
        3. If no incidents found, return {"news_details": {}}
        Link of news article: ${link}
        `;

        console.log('\n🤖 Sending to Gemini API for news details extraction...');
        // console.log(prompt);
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();

        let jsonText = text;
        if (text.startsWith("```")) {
            jsonText = text.replace(/```json|```/g, '').trim();
        }

        try {
            const parsedResponse = JSON.parse(jsonText);
            console.log("News Details Extraction Completed ----------");
            return parsedResponse.news_details;
        } catch (error) {
            console.error("Error parsing Gemini response:", error);
            console.error("Raw response:", text);
            throw new Error("Failed to parse Gemini API response as JSON");
        }
    }

    async extractLocationData(links) {
        console.log("Starting Location Data Extraction ----------");
        const prompt = `
        You are a logistics and supply chain expert. I will give you a list of news article URLs. Your task is to analyze each article and extract location-specific information.

        For each article, first extract the following news details:
        - Title of the article
        - Publication date (MUST be in ISO format: YYYY-MM-DDTHH:mm:ssZ)
        - News location
        - Full news summary
        - Short summary (3-4 words)
        - Historical references (similar past incidents)
        - Factors considered (what factors might affect the incident)

        IMPORTANT DATE RULES:
        1. If the article has a publication date, use that exact date
        2. If no date is found in the article, use the current date
        3. NEVER return "Unknown" for date
        4. Always return date in ISO format
        5. If only date is available without time, append T00:00:00Z
        6. If date is in a different format, convert it to ISO format

        Then determine if it's a port incident or sea incident and extract:
        
        For PORT incidents:
        - List ALL affected ports with their:
          * Port name
          * Port code (if available, otherwise search for the port code through web search even if you can't fine mark it as unknown)
          * Geographic coordinates (latitude, longitude)
        
        For SEA incidents:
        - The specific region/area where the incident occurred
        - Geographic coordinates (latitude, longitude)
        - Name of the shipping lane or route affected

        Return a JSON object with the following structure:
        {
            "incidents": [
                {
                    "url": "article_url",
                    "title": "article_title",
                    "date": "publication_date",
                    "news_location": "location_of_news",
                    "full_summary": "complete news summary",
                    "short_summary": "3-4 word summary",
                    "historical_references": [
                        {
                            "similar_incident": "description",
                            "actual_delay": "delay_in_days",
                            "source": "source_url"
                        }
                    ],
                    "factors_considered": [
                        "factor1",
                        "factor2"
                    ],
                    "incident_type": "port" or "sea",
                    "location_data": {
                        "ports": [
                            {
                                "name": "port_name",
                                "code": "port_code",
                                "coordinates": {
                                    "latitude": 0.0,
                                    "longitude": 0.0
                                }
                            }
                        ],
                        "sea_region": {
                            "name": "region_name",
                            "coordinates": {
                                "latitude": 0.0,
                                "longitude": 0.0
                            }
                        }
                    }
                }
            ]
        }

        Rules:
        1. Return ONLY the JSON object, no additional text
        2. If any critical information in the news is missing or marked as "Unknown" (such as port names, coordinates, or specific sea regions), perform a contextual web search using keywords from the article (e.g., "ports affected by [event]" or "shipping delays in [region]") to infer and fill in the missing data.
        When references are made to broad terms like "Multiple Ports in the Mediterranean and Asia," do not leave the ports unspecified. Instead, identify a representative list of likely affected ports based on:
        Geographic relevance to the incident
        Known trade hubs or choke points in the region
        Historical incidents of similar nature
        Include approximate coordinates, official port codes (if available), and port names based on reliable sources. Avoid using placeholders like "Unknown" unless no credible data is found after search attempts.
        3. If no incidents found, return {"incidents": []}
        4. For port incidents, include ALL potentially affected ports
        5. For sea incidents, provide the most precise coordinates possible
        6. Include both direct and indirect impacts on ports

        Here's the list of links to analyze:
        ${JSON.stringify(links, null, 2)}
        `;

        console.log('\n🤖 Sending to Gemini API for location data extraction...');
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        
        let jsonText = text;
        if (text.startsWith("```")) {
            jsonText = text.replace(/```json|```/g, '').trim();
        }
        
        try {
            const parsedResponse = JSON.parse(jsonText);
            console.log("Location Data Extraction Completed ----------");
            return parsedResponse.incidents;
        } catch (error) {
            console.error("Error parsing Gemini response:", error);
            console.error("Raw response:", text);
            throw new Error("Failed to parse Gemini API response as JSON");
        }
    }

    async predictDelay(links) {
        console.log("Starting Delay Prediction Analysis ----------");
        const prompt = `
        You are a logistics and supply chain expert specializing in delay prediction. I will give you a list of news article URLs. Your task is to analyze each article and predict the expected delay based on historical data and similar incidents.

        For each article:
        1. Identify the type of incident (e.g., port congestion, strike, weather, accident)
        2. Research similar historical incidents and their actual delays
        3. Consider current conditions and context
        4. Provide a realistic delay prediction
        5. Provide severity of delay out of 10

        Return a JSON object with the following structure:
        {
            "incidents": [
                {
                    "url": "article_url",
                    "incident_type": "type_of_incident",
                    "delay_prediction": {
                        "minimum_days": 0,
                        "maximum_days": 0,
                        "most_likely_days": 0,
                        "confidence_score": 0.0,
                        "severity_score": 0,
                        "historical_references": [
                            {
                                "similar_incident": "description",
                                "actual_delay": "delay_in_days",
                                "source": "source_url"
                            }
                        ],
                        "factors_considered": [
                            "factor1",
                            "factor2"
                        ]
                    }
                }
            ]
        }

        Rules:
        1. Return ONLY the JSON object, no additional text
        2. Use historical data to support predictions
        3. Provide a range (minimum, maximum, most likely) for delays
        4. Include confidence score (0.0 to 1.0)
        5. List specific historical incidents used for comparison
        6. Consider current market conditions and context
        7. If no delay can be predicted, set all delay values to 0
        8. Provide severity of delay out of 10
        Here's the list of links to analyze:
        ${JSON.stringify(links, null, 2)}
        `;

        console.log('\n🤖 Sending to Gemini API for delay prediction...');
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        
        let jsonText = text;
        if (text.startsWith("```")) {
            jsonText = text.replace(/```json|```/g, '').trim();
        }
        
        try {
            const parsedResponse = JSON.parse(jsonText);
            console.log("Delay Prediction Analysis Completed ----------");
            return parsedResponse.incidents;
        } catch (error) {
            console.error("Error parsing Gemini response:", error);
            console.error("Raw response:", text);
            throw new Error("Failed to parse Gemini API response as JSON");
        }
    }

    async extractIncidentData(links) {
        console.log("Starting Comprehensive Incident Analysis ----------");
        
        const combinedData = [];
        
        // Process each link sequentially
        for (const link of links) {
            try {
                console.log(`\nProcessing link: ${link}`);
                const newsDetails = await this.extractNewsDetails(link);
                // console.log(newsDetails);
                // Get location data for single link
                const locationData = await this.extractLocationData([link]);
                
                // Get delay prediction for single link 
                const delayPredictions = await this.predictDelay([link]);
                
                // Combine the data for this link
                if (locationData.length > 0) {
                    const locationIncident = locationData[0];
                    const matchingDelay = delayPredictions.find(d => d.url === locationIncident.url);
                    
                    // Validate and format date
                    let formattedDate = locationIncident.date;
                    if (!formattedDate || formattedDate === 'Unknown') {
                        formattedDate = new Date().toISOString();
                    } else {
                        try {
                            // Try to parse and reformat the date
                            const parsedDate = new Date(formattedDate);
                            if (isNaN(parsedDate.getTime())) {
                                formattedDate = new Date().toISOString();
                            } else {
                                formattedDate = parsedDate.toISOString();
                            }
                        } catch (error) {
                            formattedDate = new Date().toISOString();
                        }
                    }
                    
                    combinedData.push({
                        news_details: {
                            title: newsDetails.title || 'Unknown',
                            url: newsDetails.url,
                            date: formattedDate,
                            news_location: newsDetails.news_location || 'Unknown',
                            full_summary: newsDetails.full_summary || 'No summary available',
                            short_summary: newsDetails.short_summary || 'No summary'
                        },
                        incident_type: locationIncident.incident_type,
                        incident_location: {
                            name: locationIncident.location_data?.ports?.[0]?.name || 
                                  locationIncident.location_data?.sea_region?.name || 
                                  'Unknown',
                            coordinates: locationIncident.location_data?.ports?.[0]?.coordinates || 
                                       locationIncident.location_data?.sea_region?.coordinates || 
                                       { latitude: 0, longitude: 0 }
                        },
                        location_data: locationIncident.location_data,
                        delay_prediction: matchingDelay ? matchingDelay.delay_prediction : {
                            minimum_days: 0,
                            maximum_days: 0,
                            most_likely_days: 0,
                            confidence_score: 0.0,
                            // historical_references: locationIncident.historical_references || [],
                            // factors_considered: locationIncident.factors_considered || []
                        }
                    });
                }
                
                // Add a small delay between requests to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`Error processing link ${link}:`, error);
                // Continue with next link even if one fails
                continue;
            }
        }

        // Store to shipment_incidents.json
        const outputPath = path.join(this.dataDir, 'shipment_incidents.json');
        fs.writeFileSync(outputPath, JSON.stringify(combinedData, null, 2));

        console.log("Comprehensive Incident Analysis Completed ----------");
        return combinedData;
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
    // console.log(links);
    // analyzeNewsLinks(links).then(() => {
    //     console.timeEnd('Analysis Time');
    // }).catch(error => {
    //     console.error('❌ Analysis failed:', error);
    // });
    const newsAnalyzer = new NewsAnalyzer();
    newsAnalyzer.getReleventLinks(links).then((response) => {
        console.log(response);
        // newsAnalyzer.fakeNewsDetection(response).then((response) => {
            console.log(response);
            newsAnalyzer.extractIncidentData(response).then((response) => {
                console.log(response);
                newsIngestionService.processNewsItems(response).then((response) => {
                    console.log(response);
                }).catch(error => {
                    console.error('❌ Analysis failed:', error);
                });
            }).catch(error => {
                console.error('❌ Analysis failed:', error);
            });
        // }).catch(error => {
        //     console.error('❌ Analysis failed:', error);
        // });
    }).catch(error => {
        console.error('❌ Analysis failed:', error);
    });
    // newsAnalyzer.extractNewsDetails("https://theloadstar.com/glitches-in-new-terminal-operating-systems-spark-delays-at-south-india-ports/").then((response) => {
    //     console.log(response);
    // }).catch(error => {
    //     console.error('❌ Analysis failed:', error);
    // });

    console.timeEnd('Analysis Time');
}