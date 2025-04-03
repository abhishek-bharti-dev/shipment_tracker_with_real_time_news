const express = require('express');
const router = express.Router();
const { handleCreateNewsIngestion, handleGetNewsById, handleGetAllNews } = require('../controllers/newsIngestionController');

// Define routes
router.post('/new_incidents', handleCreateNewsIngestion);
router.get('/', handleGetAllNews);
router.get('/:newsId', handleGetNewsById);

module.exports = router;