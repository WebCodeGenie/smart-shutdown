
const { addShutdownHandler, Shutdown } = require('./src/shutdown');
const { healthCheck } = require('./src/health-check');
class ShutdownHelper {
    constructor(config = {}) {
        this.apiConfig = config
        this.apiConfig.development = config.development || false
    }

    async shutdown(config) {
        return new Shutdown(config, this.apiConfig);
    }

    async healthCheck(config) {
        return healthCheck(config, this.apiConfig);
    }
}

module.exports = {
    ShutdownHelper,
    shutdownHandlerFn: addShutdownHandler
};

