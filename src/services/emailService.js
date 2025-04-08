const axios = require('axios');

class EmailService {
    constructor() {
        this.zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL;
    }

    /**
     * Sends an email through Zapier webhook
     * @param {Object} emailData - The email data object
     * @param {string} emailData.email - Recipient email
     * @param {string} emailData.subject - Subject line of the email
     * @param {string} emailData.message - Body of the email (plain or HTML)
     * @returns {Promise<Object>} Response from Zapier
     */
    async sendEmail(emailData) {
        try {
            if (!this.zapierWebhookUrl) {
                throw new Error('Zapier webhook URL is not configured');
            }

            const { email, subject, message } = emailData;

            const response = await axios.post(this.zapierWebhookUrl, {
                email,
                subject,
                message,
            });

            return {
                success: true,
                message: 'Email sent successfully',
                data: response.data
            };
        } catch (error) {
            console.error('Error sending email:', error.message);
            return {
                success: false,
                message: error.message,
                error: error
            };
        }
    }

    /**
     * Sends a detailed incident notification with dynamic subject
     * @param {Object} data - Incident and shipment data
     * @returns {Promise<Object>} Response from email sending attempt
     */
    async sendDetailedIncidentNotification(data) {
        const {
            userName,
            userEmail,
            shipmentId,
            delayType,
            seaIssues,
            affectedPorts,
            totalDelay
        } = data;

        const startDate = new Date(seaIssues[0]?.startDate || affectedPorts[0]?.startDate).toISOString().split('T')[0];
        const endDate = new Date(new Date(startDate).getTime() + totalDelay * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const incidentDetails = delayType === 'sea' ? seaIssues[0] : affectedPorts[0];
        const location = delayType === 'sea' ? 'Red Sea' : affectedPorts.map(p => p.portName).join(', ');

        const severity = totalDelay >= 20 ? 9.2 : totalDelay >= 10 ? 7.5 : 5.0;
        const severityText = severity >= 8 ? 'Severe' : severity >= 5 ? 'Moderate' : 'Mild';

        const subject = `🚨 Shipping Disruption Alert: ${delayType === 'sea' ? 'Sea Route' : 'Port Operations'} - ${location}`;
        const message = `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <p>Dear ${userName},</p>

  <p>We are writing to inform you of a <strong>recent shipping disruption</strong> that may impact your shipment(s). Please find the details below:</p>

  <h2 style="color: #1a73e8;">🚢 Incident Details</h2>
  <ul>
    <li><strong>Affected Port:</strong> ${location}</li>
    <li><strong>Disruption Type:</strong> ${delayType === 'sea' ? 'Sea Route Disruption' : 'Port Operations Disruption'}</li>
    <li><strong>Cause:</strong> ${incidentDetails.reason}</li>
    <li><strong>Start Date:</strong> ${startDate}</li>
    <li><strong>Expected End Date:</strong> ${endDate}</li>
    <li><strong>Severity:</strong> ${severityText} (${severity}/10)</li>
  </ul>

  <h2 style="color: #f9a825;">📦 Impact on Your Shipment(s)</h2>
  <ul>
    <li><strong>Shipment ID(s):</strong> #${shipmentId}</li>
    <li><strong>Estimated Delay:</strong> ${totalDelay} Days</li>
    <li><strong>Operational Status:</strong> ${severity >= 8 ? 'Limited Operations' : severity >= 5 ? 'Partially Open' : 'Operational'}</li>
    <li><strong>Alternative Route Available:</strong> ${delayType === 'sea' ? 'Yes' : 'No'}</li>
  </ul>

  <h2 style="color: #d32f2f;">⚠️ Recommended Action</h2>
  <ul>
    <li><strong>🛡️ Monitor updates:</strong> We will continue tracking the situation and notify you of any changes.</li>
    <li><strong>📍 Consider rerouting:</strong> If the delay is critical, we recommend evaluating alternative routes.</li>
    <li><strong>📞 Contact support:</strong> If you require assistance, please reach out to your logistics manager at <a href="mailto:support@gocomet.com">support@gocomet.com</a>.</li>
  </ul>

  <p>We understand that shipping delays can be costly and disruptive. Our team is actively monitoring this situation and will provide updates as they become available.</p>

  <p>For more details, visit your dashboard: <a href="https://dashboard.gocomet.com">Track Your Shipment Here</a></p>

  <p>Best regards,<br>
  <strong>Gocomet</strong><br>
  Shipment Monitoring Team<br>
  📧 <a href="mailto:support@yourcompany.com">support@yourcompany.com</a> | 📞 +1 (800) 123-4567</p>

  <hr>

  <div style="text-align: center; margin-top: 20px;">
   <a href="https://www.gocomet.com" style="text-decoration: none;">
        <img src="https://drive.google.com/uc?export=view&id=1qHXqbGf6JSkBzh8Rm2KirfytXI-xNTSv" alt="G2 Leader 2024 Badge" style="width: 100%; max-width: 500px; border-radius: 8px;">
    </a>

    <p style="font-size: 0.9em; color: #888;">⭐ 4.8/5 on G2</p>
  </div>
</div>
`;
        return this.sendEmail({
            email: userEmail,
            subject,
            message
        });
    }
}

module.exports = new EmailService();
