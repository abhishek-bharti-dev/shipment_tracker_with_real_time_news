const User = require('../models/User');
const Shipment = require('../models/Shipment');
const Delay = require('../models/Delay');
const Port = require('../models/Port');
const News = require('../models/News');
const Incident = require('../models/Incident');
const { getUserAffectedNewsFormatted } = require('../services/newsService');

exports.getUserAffectedNewsFormatted = async (req, res) => {
  try {
    const user_id = req.user.userId;

    const formattedNews = await getUserAffectedNewsFormatted(user_id);
    
    res.status(200).json({ 
      success: true, 
      data: formattedNews 
    });
  } catch (error) {
    console.error('Error in getUserAffectedNewsFormatted controller:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching affected news', 
      error: error.message 
    });
  }
};
