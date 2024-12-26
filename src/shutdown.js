const gracefulShutdown = require('http-graceful-shutdown');

// Global array to hold shutdown handlers
global.globalErrorHandlerFn = [];

/**
 * Utility function to create a delay.
 * @param {number} time - Time in milliseconds to wait.
 * @returns {Promise<void>} Resolves after the specified time.
 */
function wait(time) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}

/**
 * Shutdown management class to handle application shutdown gracefully.
 */
class Shutdown {
    constructor(config = {}, apiConfig) {
        this.log = config.log || console.log; // Logger function (default: console.log)
        this.development = config.development || false; // Flag for development mode
        this.finally = config.finally || this.finalFunction; // Final cleanup function
        this.timeout = config.timeout || 30000; // Default timeout for shutdown operations

        // Initialize graceful shutdown for HTTP server if provided
        if (config.server) {
            gracefulShutdown(config.server, {
                signals: 'SIGINT SIGTERM', // Signals to handle
                timeout: this.timeout, // Shutdown timeout
                development: this.development, // Development mode flag
                forceExit: config.forceExit !== undefined ? config.forceExit : true, // Force process exit
                onShutdown: this.shutdownFunction.bind(this), // Shutdown handler
                finally: this.finally // Final function after shutdown
            });
        } else {

            const once = onceFactory();

            once(process, ['SIGTERM', 'SIGINT'], async (signal) => {
                await Promise.race([wait(this.timeout), this.shutdownFunction(signal)]);
                this.finally();
                await wait(2000);
                process.exit();
            });

        }

        // Log initialization
        this.log('info', 'Shutdown handler successfully initialized.');
    }

    /**
     * Default final function executed after the shutdown process is complete.
     */
    finalFunction() {
        this.log('info', 'Server gracefully shut down.');
    }

    /**
     * Shutdown function to execute registered handlers.
     * @param {string} signal - Signal that triggered the shutdown (e.g., SIGTERM, SIGINT).
     * @returns {Promise<void>} Resolves after all handlers have executed.
     */
    async shutdownFunction(signal) {
        await this.executeHandlerFunction();
        // Delay to allow for any pending operations
        await wait(2000);
        this.log('info', 'All shutdown handlers executed successfully.');
    }

    async executeHandlerFunction() {
        for (const handler of globalErrorHandlerFn) {
            try {
                await handler(); // Execute each handler                
            } catch (error) {
                this.log('error', `Error executing shutdown handler: ${error.message}`);
            }
        }
        return true;
    }
}

/**
 * Function to register a new shutdown handler.
 * @param {Function} handler - Callback function to execute during shutdown.
 */
const addShutdownHandler = (handler) => {
    globalErrorHandlerFn.push(handler);
};

module.exports = {
    Shutdown,
    addShutdownHandler
};


function onceFactory() {
    let called = false;
    return (emitter, events, callback) => {
        function call() {
            if (!called) {
                called = true;
                return callback.apply(this, arguments);
            }
        }
        events.forEach(e => emitter.on(e, call));
    };
}