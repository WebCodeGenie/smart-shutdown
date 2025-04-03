const schedule = require('node-schedule'); // Import node-schedule for scheduling cron.
const axios = require('axios'); // Import Axios for making HTTP requests.

/**
 * Health check function to check the health of a serverless API.
 * @param {Object} config - Configuration options.
 * @param {Object} apiConfig - API configuration options.
 * @returns {Promise<void>} Resolves after the API request is completed.
 */
const healthCheck = (config = {}, apiConfig) => {
    const log = config.log || console.log; // Logger function (default: console.log).
    const development = config.development != undefined ? config.development : (apiConfig?.development || false); // Flag for development mode.
    const interval = config.interval || 30; // Interval duration in seconds (default: 30 seconds).

    // Set the cron rule based on the interval.
    let rule = setTheRule(interval);

    if (development == false) {
        // Log successful initialization.
        log('info', 'Health check handler successfully initialized.');
        // Schedule the health check event using node-schedule.
        schedule.scheduleJob(
            rule,
            () => reportHealth(apiConfig).then(() => {
                // Log successful health check event.
                log('info', `Health check event for ${apiConfig?.service} service reported successfully.`)
            }).catch(err => {
                // Log failed health check event.
                log('error', `Failed to report health for ${apiConfig?.service} service: ${err.data.message}`)
            })
        );
    } else {
        log('info', 'Health check handler is in development mode.');
    }
};
/**
 * Set the cron rule based on the interval.
 * @param {Number} interval - The interval duration in seconds.
 * @returns {String} The cron rule.
 */
const setTheRule = (interval) => {
    let rule;

    if (interval < 60) {
        // Every ${interval} seconds
        rule = `*/${interval} * * * * *`;
    } else if (interval >= 60 && interval <= 300) {
        // Every ${minutes} minutes
        const minutes = Math.floor(interval / 60);
        const seconds = interval % 60 == 0 ? 0 : interval % 60;
        rule = `${seconds} */${minutes} * * * *`;
    } else {
        rule = "0 */5 * * * *"
    }
    return rule;
};
/**
 * Report the health event to an external API.
 * @param {Object} apiConfig - API configuration options.
 * @returns {Promise<void>} Resolves after the API request is completed.
 */
const reportHealth = async (apiConfig) => {
    // If the API URL and token are provided and development mode is disabled, report the health event.
    if (apiConfig?.apiUrl && apiConfig?.development == false) {
        const options = apiConfig.token
            ? { headers: { Authorization: `Bearer ${apiConfig.token}` } }
            : {};

        // Make an HTTP POST request to the API to report the health event.
        return axios.post(
            `${apiConfig.apiUrl}/report-health`,
            {
                // Include the service name in the request body.
                service: apiConfig.service,
            },
            options
        );
    }
};

module.exports = {
    healthCheck
};
