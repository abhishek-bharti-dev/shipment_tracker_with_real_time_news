const User = require('../models/User');
const Shipment = require('../models/Shipment');
const Delay = require('../models/Delay');
const Port = require('../models/Port');
const News = require('../models/News');
const Incident = require('../models/Incident');

const getUserAffectedNewsFormatted = async (userId) => {
  try {
    console.log(`Fetching affected news for user ID: ${userId}`);

    // Step 1: Get User
    const user = await User.findById(userId);
    if (!user) {
      console.error(`User not found with ID: ${userId}`);
      throw new Error('User not found');
    }

    // Step 2: Get Shipments
    const shipments = await Shipment.find({ client_id: userId });
    console.log(`Found ${shipments.length} shipments for user`);
    
    if (!shipments.length) {
      return [];
    }

    // Step 3: Get Delays for these shipments with populated port data
    const delays = await Delay.find({ shipment: { $in: shipments.map(s => s._id) } })
      .populate([
        { path: 'affected_ports.incident', model: 'incidents' },
        { path: 'sea_delays.incident', model: 'incidents' },
        { path: 'affected_ports.port', model: 'Port' }
      ]);
    
    console.log(`Found ${delays.length} delays for user's shipments`);

    // Step 4: Extract all related incident IDs from delays
    const incidentIdSet = new Set();
    for (const delay of delays) {
      for (const portDelay of delay.affected_ports || []) {
        if (portDelay.incident?._id) {
          incidentIdSet.add(portDelay.incident._id.toString());
        }
      }
      for (const seaDelay of delay.sea_delays || []) {
        if (seaDelay.incident?._id) {
          incidentIdSet.add(seaDelay.incident._id.toString());
        }
      }
    }

    console.log(`Found ${incidentIdSet.size} unique incidents affecting user's shipments`);

    if (incidentIdSet.size === 0) {
      return [];
    }

    // Step 5: Fetch incidents and their related news with populated news data
    const incidents = await Incident.find({ _id: { $in: Array.from(incidentIdSet) } })
      .populate({
        path: 'source_news',
        select: 'title summary image news_details'
      })
      .sort({ createdAt: -1 });

    console.log(`Retrieved ${incidents.length} incidents with news`);

    // Step 6: Format news response according to the new structure
    const formattedNews = incidents.map(incident => {
      const news = incident.source_news;
      if (!news) return null;

      // Get affected ports and incident type
      const affectedPorts = new Set();
      let incidentType = 'Unknown Type';

      for (const delay of delays) {
        // Check port delays
        const portDelays = delay.affected_ports?.filter(p => 
          p.incident?._id.toString() === incident._id.toString()
        ) || [];

        if (portDelays.length > 0) {
          incidentType = 'Port';
          portDelays.forEach(portDelay => {
            if (portDelay.port?.port_name) {
              affectedPorts.add(portDelay.port.port_name);
            }
          });
        }

        // Check sea delays
        const seaDelays = delay.sea_delays?.filter(s => 
          s.incident?._id.toString() === incident._id.toString()
        ) || [];

        if (seaDelays.length > 0) {
          incidentType = 'Sea';
          // For sea incidents, get the location from the incident
          if (incident.location) {
            affectedPorts.add(incident.location);
          }
        }
      }

      return {
        title: news.title,
        summary: news.summary,
        image: news.image || 'https://exampleImage.com',
        affectedPort: Array.from(affectedPorts).join(', ') || 'Unknown Port',
        incidentType: incidentType
      };
    }).filter(Boolean); // Remove any null entries

    console.log(`Formatted ${formattedNews.length} news items for user`);
    return formattedNews;
  } catch (error) {
    console.error('Error in getUserAffectedNewsFormatted service:', error);
    throw error;
  }
};

module.exports = {
  getUserAffectedNewsFormatted
}; 