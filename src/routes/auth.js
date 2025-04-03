const express = require('express');
const router = express.Router();
const { signup, login } = require('../controllers/auth');
const { authenticate } = require('../security/authMiddleware');

// Public routes (no authentication required)
router.post('/signup', signup);
router.post('/login', login);


// Protected routes (authentication required)
// Add any additional auth routes here that should be protected
// For example: profile, change password, etc.
// router.get('/profile', authenticate, authController.getProfile);
// router.put('/change-password', authenticate, authController.changePassword);

module.exports = router;
