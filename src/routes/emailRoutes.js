const express = require('express');
const router = express.Router();
const notificationHandler = require('../handlers/notificationHandler');

// Route to send notifications
router.post('/notifications', async (req, res) => {
    try {
        const { notifications } = req.body;
        if (!notifications || !Array.isArray(notifications)) {
            return res.status(400).json({ error: 'Invalid notifications data' });
        }

        const results = await notificationHandler.processNotifications(notifications);
        res.json(results);
    } catch (error) {
        console.error('Error processing notifications:', error);
        res.status(500).json({ error: 'Failed to process notifications' });
    }
});

module.exports = router; 