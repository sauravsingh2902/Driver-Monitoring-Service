// index.js
const express = require('express');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const app = express();
const port = 3000;

// Middleware to parse JSON requests
app.use(express.json());

// In-memory data structures to store events and alerts
const events = [];
const alerts = [];
const locationThresholds = {
    highway: 4,
    city_center: 3,
    commercial: 2,
    residential: 1,
};

// Helper function to evaluate the rule and generate alerts
function evaluateRule() {
    const currentTime = new Date();
    const fiveMinutesAgo = new Date(currentTime - 5 * 60 * 1000);

    // Filter events within the last 5 minutes
    const recentEvents = events.filter(
        (event) => new Date(event.timestamp) >= fiveMinutesAgo
    );

    // Check for location-specific thresholds and generate alerts
    for (const locationType in locationThresholds) {
        const threshold = locationThresholds[locationType];
        const unsafeEvents = recentEvents.filter(
            (event) =>
                event.location_type === locationType && event.is_driving_safe === false
        );

        if (unsafeEvents.length >= threshold) {
            // Check if an alert for this location type has already been generated in the last 5 minutes
            const existingAlert = alerts.find(
                (alert) =>
                    alert.location_type === locationType &&
                    new Date(alert.timestamp) >= fiveMinutesAgo
            );

            if (!existingAlert) {
                // Generate a new alert
                const alert = {
                    id: uuidv4(), // Generate a unique ID (you need to import 'uuid')
                    timestamp: currentTime.toISOString(),
                    location_type: locationType,
                };
                alerts.push(alert);
            }
        }
    }
}


// Endpoint to receive driving events
app.post('/event', (req, res) => {
    const event = req.body;
    events.push(event);
    // Evaluate the rule when a new event is received
    evaluateRule();
    res.status(200).json({ message: 'Event received' });
});

// Endpoint to retrieve alerts by ID
app.get('/alert/:alert_id', (req, res) => {
    const alertId = req.params.alert_id;
    const alert = alerts.find((a) => a.id === alertId);
    if (!alert) {
        return res.status(404).json({ message: 'Alert not found' });
    }
    res.status(200).json(alert);
});
// Endpoint to retrieve all alerts
app.get('/alert', (req, res) => {
    if (alerts.length === 0) {
        return res.status(404).json({ message: 'Alerts not found' });
    }
    res.status(200).json(alerts);
});

let task = cron.schedule('*/5 * * * *', () => {
    console.log('Running the rule...');

    // Call the evaluateRule function
    evaluateRule();
});
task.start();
// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
