require('dotenv').config();
const emailService = require('./services/emailService');

const testData = {
    userName: "Tauhid",
    userEmail: "asadneyaz5555@gmail.com",
    shipmentId: "67f0f7f42bcd1aaeba07ac60",
    delayType: "sea",
    seaIssues: [
        {
            incidentId: "67eeece0501f721c7f28136e",
            delayDays: 29,
            reason: "S. Union attack brings Red Sea shipping crisis back to fore",
            startDate: "2025-04-03T20:17:36.684Z"
        }
    ],
    affectedPorts: [],
    totalDelay: 29    
};

async function sendTestEmail() {
    try {
        const result = await emailService.sendDetailedIncidentNotification(testData);
        console.log('✅ Email sent:', result);
    } catch (err) {
        console.error('❌ Email failed:', err.message);
    }
}

sendTestEmail();
