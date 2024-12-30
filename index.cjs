
const { addShutdownHandler, Shutdown } = require('./src/shutdown');

class ShutdownHelper {
    constructor(config = {}) {
        this.apiConfig = config
        this.apiConfig.development = config.development || false
    }

    async shutdown(config) {
        return new Shutdown(config, this.apiConfig);
    }
}

module.exports = {
    ShutdownHelper,
    shutdownHandlerFn: addShutdownHandler
};

