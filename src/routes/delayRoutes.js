const express = require('express');
const router = express.Router();
const { processDelay } = require('../controllers/delayController');

router.post('/process-delays', processDelay);

module.exports = router;