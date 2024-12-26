import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import the CommonJS module
const { addShutdownHandler, Shutdown } = require('./src/shutdown');

export class ShutdownHelper {
    constructor() {
        this.apiConfig = {}
    }

    async shutdown(config) {
        return new Shutdown(config, this.apiConfig);
    }
}

export const shutdownHandlerFn = addShutdownHandler