const express = require('express');
const router = express.Router();
const { handleCreateNewsIngestion, handleGetNewsById, handleGetAllNews } = require('../controllers/newsIngestionController');
const { getUserAffectedNewsFormatted } = require('../controllers/newsController');
const { authenticateToken } = require('../middleware/auth');

// Define routes
router.post('/new_incidents', handleCreateNewsIngestion);
router.get('/', handleGetAllNews);
// Add formatted news route with authentication - must come before :newsId route
router.get('/formatted', authenticateToken, getUserAffectedNewsFormatted);
// Parameterized route should come last
router.get('/:newsId', handleGetNewsById);

module.exports = router;