require('dotenv').config();
const notificationHandler = require('./handlers/notificationHandler');

const testData = [
    {
        "userName": "abhishek",
        "userEmail": "bhartiabhishek310@gmail.com",
        "shipmentId": "67f0f7f42bcd1aaeba07ac60",
        "delayType": "sea",
        "seaIssues": [
            {
                "incidentId": "67eeece0501f721c7f28136e",
                "delayDays": 29,
                "reason": "S. Union attack brings Red Sea shipping crisis back to fore",
                "startDate": "2025-04-03T20:17:36.684Z"
            }
        ],
        "affectedPorts": [],
        "totalDelay": 29
    },
    {
        "userName": "Tauhid",
        "userEmail": "asadneyaz5555@gmail.com",
        "shipmentId": "67f0f7f42bcd1aaeba07ac61",
        "delayType": "sea",
        "seaIssues": [
            {
                "incidentId": "67eeece0501f721c7f28136e",
                "delayDays": 33,
                "reason": "S. Union attack brings Red Sea shipping crisis back to fore",
                "startDate": "2025-04-03T20:17:36.684Z"
            }
        ],
        "affectedPorts": [],
        "totalDelay": 33
    },
    {
        "userName": "Gaurav",
        "userEmail": "gauravrajsingh047@gmail.com",
        "shipmentId": "67f0f7f42bcd1aaeba07ac62",
        "delayType": "sea",
        "seaIssues": [
            {
                "incidentId": "67eeece0501f721c7f28136e",
                "delayDays": 30,
                "reason": "S. Union attack brings Red Sea shipping crisis back to fore",
                "startDate": "2025-04-03T20:17:36.684Z"
            }
        ],
        "affectedPorts": [],
        "totalDelay": 30
    },
    {
        "userName": "King",
        "userEmail": "kingpsycho404@gmail.com",
        "shipmentId": "67f0f7f42bcd1aaeba07ac63",
        "delayType": "sea",
        "seaIssues": [
            {
                "incidentId": "67eeece0501f721c7f28136e",
                "delayDays": 26,
                "reason": "S. Union attack brings Red Sea shipping crisis back to fore",
                "startDate": "2025-04-03T20:17:36.684Z"
            }
        ],
        "affectedPorts": [],
        "totalDelay": 26
    }
];

async function testHandler() {
    try {
        const results = await notificationHandler.processNotifications(testData);
        console.log('Notification Results:', JSON.stringify(results, null, 2));
    } catch (error) {
        console.error('Error processing notifications:', error);
    }
}

testHandler(); 