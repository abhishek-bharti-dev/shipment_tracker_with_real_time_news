const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to authenticate users using JWT
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Attach the user data to the request object
      req.user = user.getProfile();
      return next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
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