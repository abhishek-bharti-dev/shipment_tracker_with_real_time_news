const axios = require('axios');

class EmailService {
    constructor() {
        // The Zapier webhook URL should be set in environment variables
        this.zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL;
    }

    /**
     * Sends an email through Zapier webhook
     * @param {Object} emailData - The email data object
     * @param {string} emailData.to - Recipient email address
     * @param {string} emailData.subject - Email subject
     * @param {string} emailData.body - Email body content
     * @param {Object} [emailData.additionalData] - Any additional data to be sent to Zapier
     * @returns {Promise<Object>} Response from Zapier
     */
    async sendEmail(emailData) {
        try {
            if (!this.zapierWebhookUrl) {
                throw new Error('Zapier webhook URL is not configured');
            }

            if (!emailData.to || !emailData.subject || !emailData.body) {
                throw new Error('Missing required email fields (to, subject, or body)');
            }

            // Format the data for Zapier
            const zapierData = {
                email: emailData.to,
                subject: emailData.subject,
                message: emailData.body,
                ...emailData.additionalData
            };

            // Send the data to Zapier webhook
            const response = await axios.post(this.zapierWebhookUrl, zapierData);

            return {
                success: true,
                message: 'Email sent successfully',
                data: response.data
            };
        } catch (error) {
            console.error('Error sending email:', error);
            return {
                success: false,
                message: error.message,
                error: error
            };
        }
    }

    /**
     * Sends a notification email for incidents
     * @param {Object} incidentData - The incident notification data
     * @param {string} incidentData.to - Recipient email address
     * @param {string} incidentData.incidentType - Type of incident
     * @param {string} incidentData.location - Location of incident
     * @param {string} incidentData.severity - Severity level
     * @param {string} incidentData.description - Incident description
     * @returns {Promise<Object>} Response from email sending attempt
     */
    async sendIncidentNotification(incidentData) {
        const emailContent = {
            to: incidentData.to,
            subject: `Incident Alert: ${incidentData.incidentType} at ${incidentData.location}`,
            body: `
                Incident Notification
                
                Type: ${incidentData.incidentType}
                Location: ${incidentData.location}
                Severity: ${incidentData.severity}
                
                Description:
                ${incidentData.description}
                
                Please check your dashboard for more details.
            `,
            additionalData: {
                incidentType: incidentData.incidentType,
                severity: incidentData.severity,
                location: incidentData.location
            }
        };

        return this.sendEmail(emailContent);
    }

    /**
     * Sends a delay notification email
     * @param {Object} delayData - The delay notification data
     * @param {string} delayData.to - Recipient email address
     * @param {string} delayData.shipmentId - Shipment ID
     * @param {string} delayData.vesselName - Vessel name
     * @param {number} delayData.delayDuration - Delay duration in days
     * @param {string} delayData.reason - Reason for delay
     * @returns {Promise<Object>} Response from email sending attempt
     */
    async sendDelayNotification(delayData) {
        const emailContent = {
            to: delayData.to,
            subject: `Shipment Delay Alert: ${delayData.shipmentId}`,
            body: `
                Delay Notification
                
                Shipment ID: ${delayData.shipmentId}
                Vessel: ${delayData.vesselName}
                Delay Duration: ${delayData.delayDuration} days
                
                Reason for Delay:
                ${delayData.reason}
                
                Please check your dashboard for more details and updates.
            `,
            additionalData: {
                shipmentId: delayData.shipmentId,
                delayDuration: delayData.delayDuration,
                vesselName: delayData.vesselName
            }
        };

        return this.sendEmail(emailContent);
    }
}

module.exports = new EmailService();
