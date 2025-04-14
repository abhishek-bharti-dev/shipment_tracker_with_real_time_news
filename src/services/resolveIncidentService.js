const mongoose = require('mongoose');
const Delay = require('../models/Delay');
const VesselTracking = require('../models/VesselTracking');
const Port = require('../models/Port');
const Incident = require('../models/Incident');
const User = require('../models/User');
const Shipment = require('../models/Shipment');
const News = require('../models/News');
const emailService = require('./emailService');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

class ResolveIncidentService {
    async resolveIncident(incident) {
        try {
            console.log("Resolving incident:", incident._id);

            // Find and delete delay entries associated with this incident
            const delayEntries = await Delay.find({
                $or: [
                    { 'affected_ports.incidents': incident._id },
                    { 'sea_delays.incidents': incident._id }
                ]
            });

            console.log("Delay entries:", delayEntries);

            for (const delay of delayEntries) {
                await Delay.findByIdAndDelete(delay._id);
            }

            // Update the incident status and total_shipments_resolved
            await Incident.findByIdAndUpdate(
                incident._id,
                {
                    status: 'resolved',
                    total_shipments_resolved: incident.total_shipments_affected
                }
            );

            console.log(`Incident ${incident._id} resolved successfully`);
        } catch (error) {
            console.error(`Error resolving incident ${incident._id}:`, error);
            throw error;
        }
    }

    async resolveIfDelayDaysPassed(incidents) {
        const incidentsToResolve = [];
        const now = new Date();

        for (const incident of incidents) {
            const delayDays = incident.estimated_duration_days;
            const createdAt = new Date(incident.createdAt);
            const daysPassed = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

            if (daysPassed >= delayDays) {
                incidentsToResolve.push(incident);
            }
        }

        return incidentsToResolve;
    }

    async resolveIfCertainVesselPassed(incidents) {
        const incidentsToResolve = [];
    
        for (const incident of incidents) {
            const { total_shipments_affected, total_shipments_resolved } = incident;
    
            // Safety check to avoid division by zero
            if (total_shipments_affected === 0) continue;
    
            const resolvedPercentage = (total_shipments_resolved / total_shipments_affected) * 100;
    
            if (resolvedPercentage >= 15) {
                incidentsToResolve.push(incident);
            }
        }
    
        return incidentsToResolve;
    }

    async resolveIfClosingNewsReceived(incidents) {
        const incidentsToResolve = [];
        const newsData = [];
    
        // Step 1: Collect news data related to each incident
        for (const incident of incidents) {
            try {
                const news = await News.findById(incident.source_news);
                if (!news) continue;
    
                newsData.push({
                    incident_id: incident._id.toString(),
                    title: news.title,
                    details: news.news_details,
                    published_date: news.published_date
                });
            } catch (error) {
                console.error(`Error fetching news for incident ${incident._id}:`, error);
            }
        }
    
        if (newsData.length === 0) return incidentsToResolve;
    
        // Step 2: Build a clear prompt asking for JSON response
        const combinedPrompt = `
    You're an AI assistant analyzing incident resolution.
    
    Here's a list of news articles related to incidents. For each, analyze whether the issue described is now resolved. Base your judgment on the content of the news and the time since publication.
    
    Respond ONLY in valid JSON format like:
    [
      {"<incident_id>": true},
      {"<incident_id>": false},
      ...
    ]
    
    News List:
    ${newsData.map(news => `
    Incident ID: ${news.incident_id}
    Title: ${news.title}
    Details: ${news.details}
    Published Date: ${news.published_date}
    `).join('\n')}
    `;
        // console.log(combinedPrompt)
        try {
            // Step 3: Send to Gemini API
            const result = await model.generateContent(combinedPrompt);
            const response = await result.response;
            // console.log(response)
            let rawText = await response.text();
            // console.log(rawText)
            // Clean up the response by removing markdown formatting
            rawText = rawText.replace(/```json\n?|\n?```/g, '').trim();
            // console.log(rawText)
            // Step 4: Parse the JSON safely
            let parsed;
            try {
                parsed = JSON.parse(rawText);
            } catch (err) {
                console.error("Failed to parse Gemini response as JSON:", rawText);
                return [];
            }
    
            // Step 5: Filter only incidents with true (resolved)
            for (const entry of parsed) {
                const [incidentId, isResolved] = Object.entries(entry)[0];
                if (isResolved === true) {
                    const incident = incidents.find(i => i._id.toString() === incidentId);
                    if (incident) incidentsToResolve.push(incident);
                }
            }
    
            return incidentsToResolve;
        } catch (error) {
            console.error('Error processing with Gemini API:', error);
            return [];
        }
    }
    

    async resolveIncidents() {
        try {
            const incidents = await Incident.find({ status: 'ongoing' });
            const incidentsToResolve1 = await this.resolveIfDelayDaysPassed(incidents);
            const incidentsToResolve2 = await this.resolveIfCertainVesselPassed(incidents);
            const incidentsToResolve3 = await this.resolveIfClosingNewsReceived(incidents);
            // console.log(incidentsToResolve3)
            // return

            // Combine both lists, keyed by incident _id to remove duplicates
            const incidentMap = new Map();

            [...incidentsToResolve1, ...incidentsToResolve2, ...incidentsToResolve3].forEach((incident) => {
                incidentMap.set(incident._id.toString(), incident);
            });

            const incidentsToResolve = Array.from(incidentMap.values());


            if (incidentsToResolve.length > 0) {
                for (const incident of incidentsToResolve) {
                    await this.resolveIncident(incident);
                }

                console.log("All qualifying incidents resolved.");
            } else {
                console.log("No incidents to resolve.");
            }
        } catch (error) {
            console.error('Error in resolveIncidents service:', error);
            throw error;
        }
    }
}

module.exports = new ResolveIncidentService();
