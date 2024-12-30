import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import the CommonJS module
const { addShutdownHandler, Shutdown } = require('./src/shutdown');

export class ShutdownHelper {
    constructor(config) {
        this.apiConfig = config
        this.apiConfig.development = config.development || false
    }

    async shutdown(config) {
        return new Shutdown(config, this.apiConfig);
    }
}

export const shutdownHandlerFn = addShutdownHandler