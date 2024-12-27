const gracefulShutdown = require('http-graceful-shutdown'); // Import graceful shutdown library for handling process termination signals.

// Global array to hold shutdown handler functions.
global.globalErrorHandlerFn = [];

/**
 * Shutdown management class to handle application shutdown gracefully.
 */
class Shutdown {
    /**
     * Constructor to initialize shutdown management.
     * @param {object} config - Configuration for the shutdown manager.
     * @param {object} [apiConfig] - Additional API configuration (not currently used).
     */
    constructor(config = {}, apiConfig) {
        // Assign configuration options with defaults.
        this.log = config.log || console.log; // Logger function (default: console.log).
        this.development = config.development || false; // Flag for development mode.
        this.finally = config.finally || this.defaultFinalFunction; // Final cleanup function.
        this.timeout = config.timeout || 30000; // Default timeout for shutdown operations.

        // Initialize graceful shutdown for an HTTP server, if provided.
        if (config.server) {
            gracefulShutdown(config.server, {
                signals: 'SIGINT SIGTERM', // Signals to handle.
                timeout: this.timeout, // Shutdown timeout.
                development: this.development, // Development mode flag.
                forceExit: config.forceExit !== undefined ? config.forceExit : true, // Force process exit.
                onShutdown: this.shutdownFunction.bind(this), // Shutdown handler.
                finally: this.finally.bind(this) // Final function after shutdown.
            });
        } else {
            // Handle signals manually if no HTTP server is provided.
            const once = onceFactory(); // Ensure handlers run only once.

            once(process, ['SIGTERM', 'SIGINT'], async signal => {
                await Promise.race([wait(this.timeout), this.shutdownFunction(signal)]); // Execute shutdown logic with a timeout.
                this.finally(); // Execute final cleanup.
                await wait(2000); // Allow some delay before exiting.
                process.exit(); // Exit the process.
            });
        }

        // Log initialization success.
        this.log('info', 'Shutdown handler successfully initialized.');
    }

    /**
     * Default final cleanup function executed after the shutdown process completes.
     */
    defaultFinalFunction() {
        this.log('info', 'Server gracefully shut down.');
    }

    /**
     * Shutdown function to execute registered handlers and log shutdown completion.
     * @param {string} signal - Signal that triggered the shutdown (e.g., SIGTERM, SIGINT).
     * @returns {Promise<void>} Resolves after all handlers have executed.
     */
    async shutdownFunction(signal) {
        this.log('info', `Received signal: ${signal}. Executing shutdown handlers.`);
        await this.executeHandlerFunctions(); // Execute all registered handlers.
        await wait(2000); // Delay to ensure pending operations complete.
        this.log('info', 'All shutdown handlers executed successfully.');
    }

    /**
     * Execute all registered shutdown handlers sequentially.
     * @returns {Promise<boolean>} Resolves to true after handlers are executed.
     */
    async executeHandlerFunctions() {
        for (const handler of globalErrorHandlerFn) {
            try {
                await handler(); // Execute each handler.
            } catch (error) {
                this.log('error', `Error executing shutdown handler: ${error.message}`);
            }
        }
        return true;
    }
}

/**
 * Register a new shutdown handler function.
 * @param {Function} handler - Callback function to execute during shutdown.
 */
const addShutdownHandler = handler => {
    globalErrorHandlerFn.push(handler);
};

/**
 * Factory function to ensure a callback is executed only once for specified events.
 * @returns {Function} A function to register one-time event listeners.
 */
function onceFactory() {
    let called = false; // Track whether the callback has been executed.
    return (emitter, events, callback) => {
        const callOnce = (...args) => {
            if (!called) {
                called = true;
                callback.apply(this, args); // Execute the callback with arguments.
            }
        };
        events.forEach(event => emitter.on(event, callOnce)); // Attach the callback to each event.
    };
}

/**
 * Utility function to create a delay.
 * @param {number} time - Time in milliseconds to wait.
 * @returns {Promise<void>} Resolves after the specified time.
 */
function wait(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

// Export the Shutdown class and handler registration function.
module.exports = {
    Shutdown,
    addShutdownHandler
};
