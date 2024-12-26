
const { addShutdownHandler, Shutdown } = require('./src/shutdown');

class ShutdownHelper {
    constructor() {
        this.apiConfig = {}
    }

    async shutdown(config) {
        return new Shutdown(config, this.apiConfig);
    }
}

module.exports = {
    ShutdownHelper,
    shutdownHandlerFn: addShutdownHandler
};

