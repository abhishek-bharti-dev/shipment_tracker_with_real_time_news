const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');

/**
 * @route POST /api/email/send
 * @description Send an email with custom content
 * @access Public
 */
router.post('/send', async (req, res) => {
    try {
        const { to, subject, body } = req.body;

        // Validate required fields
        if (!to || !subject || !body) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields. Please provide to, subject, and body.'
            });
        }

        const result = await emailService.sendEmail({
            to,
            subject,
            body,
            additionalData: {
                timestamp: new Date().toISOString()
            }
        });

        if (result.success) {
            res.status(200).json({
                success: true,
                message: 'Email sent successfully',
                data: result.data
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send email',
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error in send email route:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending email',
            error: error.message
        });
    }
});

/**
 * @route POST /api/email/test
 * @description Send a test email
 * @access Public
 */
router.post('/test', async (req, res) => {
    try {
        const { to, subject, body } = req.body;

        // If no email provided, use default test email
        const testEmail = to || "neyaztauhid5555@gmail.com";
        const testSubject = subject || "Test Email from Shipment Tracker";
        const testBody = body || `
            Hello!
            
            This is a test email from your Shipment Tracker system.
            If you're receiving this email, it means the email service is working correctly.
            
            Best regards,
            Shipment Tracker Team
        `;

        const result = await emailService.sendEmail({
            to: testEmail,
            subject: testSubject,
            body: testBody,
            additionalData: {
                test: true,
                timestamp: new Date().toISOString()
            }
        });

        if (result.success) {
            res.status(200).json({
                success: true,
                message: 'Test email sent successfully',
                data: result.data
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send test email',
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error in test email route:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending test email',
            error: error.message
        });
    }
});

module.exports = router; 