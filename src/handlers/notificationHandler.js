const emailService = require('../services/emailService');

class NotificationHandler {
    /**
     * Process and send notifications for multiple users
     * @param {Array} notifications - Array of notification objects
     * @returns {Promise<Object>} Results of sending notifications
     */
    async processNotifications(notifications) {
        const results = {
            success: [],
            failed: [],
            total: notifications.length
        };

        // Group notifications by user email to avoid duplicate emails
        const groupedNotifications = this.groupByUser(notifications);

        // Process each user's notifications
        for (const [userEmail, userNotifications] of Object.entries(groupedNotifications)) {
            try {
                // Combine multiple shipments for the same user
                const combinedNotification = this.combineUserNotifications(userNotifications);
                
                // Send the notification
                const result = await emailService.sendDetailedIncidentNotification(combinedNotification);
                
                if (result.success) {
                    results.success.push({
                        userEmail,
                        userName: combinedNotification.userName,
                        shipmentIds: combinedNotification.shipmentIds
                    });
                } else {
                    results.failed.push({
                        userEmail,
                        error: result.error
                    });
                }
            } catch (error) {
                results.failed.push({
                    userEmail,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Group notifications by user email
     * @param {Array} notifications - Array of notification objects
     * @returns {Object} Grouped notifications by user email
     */
    groupByUser(notifications) {
        return notifications.reduce((acc, notification) => {
            const { userEmail } = notification;
            if (!acc[userEmail]) {
                acc[userEmail] = [];
            }
            acc[userEmail].push(notification);
            return acc;
        }, {});
    }

    /**
     * Combine multiple notifications for the same user
     * @param {Array} notifications - Array of notifications for a single user
     * @returns {Object} Combined notification object
     */
    combineUserNotifications(notifications) {
        // Get the first notification as base
        const baseNotification = notifications[0];
        
        // Combine all shipment IDs
        const shipmentIds = notifications.map(n => n.shipmentId);
        
        // Find the maximum delay
        const maxDelay = Math.max(...notifications.map(n => n.totalDelay));
        
        // Combine sea issues and affected ports
        const seaIssues = notifications
            .filter(n => n.delayType === 'sea')
            .flatMap(n => n.seaIssues);
            
        const affectedPorts = notifications
            .filter(n => n.delayType === 'port')
            .flatMap(n => n.affectedPorts);

        return {
            userName: baseNotification.userName,
            userEmail: baseNotification.userEmail,
            shipmentIds,
            delayType: seaIssues.length > 0 ? 'sea' : 'port',
            seaIssues,
            affectedPorts,
            totalDelay: maxDelay
        };
    }
}

module.exports = new NotificationHandler(); 