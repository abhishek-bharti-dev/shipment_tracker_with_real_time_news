const User = require('../models/User');
const Shipment = require('../models/Shipment');
const Delay = require('../models/Delay');
const Port = require('../models/Port');
const News = require('../models/News');
const Incident = require('../models/Incident');

const getUserAffectedNewsFormatted = async (userId) => {
  try {
    // console.log("userId",userId);
    // return userId;
    // console.log(`Fetching affected news for user ID: ${userId}`);

    // Step 1: Get User
    // const user = await User.findById(userId);
    // if (!user) {
    //   console.error(`User not found with ID: ${userId}`);
    //   throw new Error('User not found');
    // }

    // Step 1: Get Shipments
    const shipments = await Shipment.find({ client_id: userId });
    console.log(`Found ${shipments.length} shipments for user`);
    
    if (!shipments.length) {
      return [];
    }

    // Step 2: Get Delays for these shipments with populated port data
    const delays = await Delay.find({ shipment: { $in: shipments.map(s => s._id) } })
      .populate([
        { path: 'affected_ports.incidents', model: 'incidents' },
        { path: 'sea_delays.incidents', model: 'incidents' }
      ]);
    
    // console.log(`Found ${delays.length} delays for user's shipments`);

    // Step 3: Extract all related incident IDs from delays
    const incidentIdSet = new Set();
    for (const delay of delays) {
      if (delay.location_type === 'port') {
        for (const portDelay of delay.affected_ports || []) {
          for (const incident of portDelay.incidents || []) {
            incidentIdSet.add(incident._id.toString());
          }
        }
      } else if (delay.location_type === 'sea') {
        for (const seaDelay of delay.sea_delays || []) {
          for (const incident of seaDelay.incidents || []) {
            incidentIdSet.add(incident._id.toString());
          }
        }
      }
    }

    // console.log(`Found ${incidentIdSet.size} unique incidents affecting user's shipments`);

    if (incidentIdSet.size === 0) {
      return [];
    }

    // Step 4: Fetch incidents and their related news with populated news data
    const incidents = await Incident.find({ _id: { $in: Array.from(incidentIdSet) } })
      .populate({
        path: 'source_news',
        select: 'title summary image news_details news_location published_date url'
      })
      .sort({ createdAt: -1 });

    // console.log(`Retrieved ${incidents.length} incidents with news`);

    // Step 5: Format news response according to the new structure
    const formattedNews = incidents.map(incident => {
      const news = incident.source_news;
      console.log("news: ", news);
      if (!news) return null;

      // Get affected ports and incident type
      const affectedPorts = new Set();
      let incidentType = incident.location_type;
      let severity = incident.severity;
      let estimatedDuration = incident.estimated_duration_days;
      let status = incident.status;

      for (const delay of delays) {
        if (delay.location_type === 'port') {
          const portDelays = delay.affected_ports?.filter(p => 
            p.incidents?.some(i => i._id.toString() === incident._id.toString())
          ) || [];

          if (portDelays.length > 0) {
            portDelays.forEach(portDelay => {
              affectedPorts.add(portDelay.port_code);
            });
          }
        } else if (delay.location_type === 'sea') {
          const seaDelays = delay.sea_delays?.filter(s => 
            s.incidents?.some(i => i._id.toString() === incident._id.toString())
          ) || [];

          if (seaDelays.length > 0 && news.news_location) {
            affectedPorts.add(news.news_location);
          }
        }
      }

      return {
        title: news.title,
        summary: news.summary,
        image: news.image || 'https://exampleImage.com',
        affectedPort: Array.from(affectedPorts).join(', ') || 'Unknown Location',
        incidentType: incidentType,
        severity: severity,
        estimatedDuration: estimatedDuration,
        status: status,
        publishedDate: news.published_date,
        url: news.url,
        newsDetails: news.news_details
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