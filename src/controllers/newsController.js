const User = require('../models/User');
const Shipment = require('../models/Shipment');
const Delay = require('../models/Delay');
const Port = require('../models/Port');
const News = require('../models/News');
const Incident = require('../models/Incident');

exports.getUserAffectedNewsFormatted = async (req, res) => {
  try {
    // Get user ID from the authenticated request
    const userId = req.user.userId;
    console.log(`Fetching affected news for user ID: ${userId}`);

    // Step 1: Get User
    const user = await User.findById(userId);
    if (!user) {
      console.error(`User not found with ID: ${userId}`);
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Step 2: Get Shipments
    const shipments = await Shipment.find({ client_id: userId });
    console.log(`Found ${shipments.length} shipments for user`);
    
    if (!shipments.length) {
      return res.status(200).json({ 
        success: true, 
        data: [] 
      });
    }

    // Step 3: Get Delays for these shipments
    const delays = await Delay.find({ shipment: { $in: shipments.map(s => s._id) } })
      .populate([
        { path: 'affected_ports.incident', model: 'incidents' },
        { path: 'sea_delays.incident', model: 'incidents' }
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
      return res.status(200).json({ 
        success: true, 
        data: [] 
      });
    }

    // Step 5: Fetch incidents and their related news
    const incidents = await Incident.find({ _id: { $in: Array.from(incidentIdSet) } })
      .populate('source_news')
      .sort({ createdAt: -1 });

    console.log(`Retrieved ${incidents.length} incidents with news`);

    // Step 6: Format news response
    const formattedNews = incidents.map(incident => {
      const news = incident.source_news;
      if (!news) return null;

      return {
        title: news.title,
        description: news.summary,
        impact: incident.impact,
        severity: incident.severity,
        affected_shipments: shipments
          .filter(shipment => 
            delays.some(delay => 
              delay.shipment.toString() === shipment._id.toString() &&
              (delay.affected_ports.some(p => p.incident?._id.toString() === incident._id.toString()) ||
               delay.sea_delays.some(s => s.incident?._id.toString() === incident._id.toString()))
            )
          )
          .map(shipment => {
            // Find the relevant delay for this shipment and incident
            const relevantDelay = delays.find(d => 
              d.shipment.toString() === shipment._id.toString() &&
              (d.affected_ports.some(p => p.incident?._id.toString() === incident._id.toString()) ||
               d.sea_delays.some(s => s.incident?._id.toString() === incident._id.toString()))
            );

            // Get the specific port or sea delay that matches this incident
            const portDelay = relevantDelay?.affected_ports.find(p => 
              p.incident?._id.toString() === incident._id.toString()
            );
            const seaDelay = relevantDelay?.sea_delays.find(s => 
              s.incident?._id.toString() === incident._id.toString()
            );

            // Use the actual delay from either port or sea delay, or fallback to incident's estimated duration
            const actualDelay = portDelay?.delay_days || seaDelay?.delay_days || incident.estimated_duration_days;

            return {
              id: shipment._id,
              vessel_name: shipment.vessel_name,
              origin_port: shipment.origin_port,
              destination_port: shipment.destination_port,
              impact: incident.impact,
              delay: actualDelay || incident.estimated_duration_days // Use actual delay or fallback to estimated duration
            };
          }),
        created_at: news.createdAt
      };
    }).filter(Boolean); // Remove any null entries

    console.log(`Formatted ${formattedNews.length} news items for user`);
    res.status(200).json({ 
      success: true, 
      data: formattedNews 
    });
  } catch (error) {
    console.error('Error in getUserAffectedNewsFormatted:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching affected news', 
      error: error.message 
    });
  }
};
