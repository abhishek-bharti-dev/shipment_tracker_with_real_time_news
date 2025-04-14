const jwt = require('jsonwebtoken');
const User = require('../models/User');
const axios = require('axios');

/**
 * Middleware to authenticate users using Xano API
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    // Verify the token and get user details from Xano API
    try {
      const response = await axios.get('https://x8ki-letl-twmt.n7.xano.io/api:539QLzhw/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data) {
        // Attach the user data to the request object
        req.user = response.data;
        return next();
      }
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    return res.status(401).json({ message: 'Authentication failed' });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Authentication failed', error: error.message });
  }
};

/**
 * Middleware to check if user has admin role
 */
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
};

module.exports = {
  authenticate,
  isAdmin
}; 