const gracefulShutdown = require('http-graceful-shutdown'); // Import graceful shutdown library for managing process termination signals.
const axios = require('axios'); // Import Axios for making HTTP requests.

// Global array to hold shutdown handler functions.
global.globalErrorHandlerFn = [];

/**
 * Shutdown management class to handle application shutdown gracefully.
 */
class Shutdown {
    /**
     * Constructor to initialize the shutdown manager.
     * @param {object} config - Configuration for the shutdown manager.
     * @param {object} [apiConfig] - API configuration for reporting shutdown events.
     */
    constructor(config = {}, apiConfig) {
        this.apiConfig = apiConfig;
        // Assign configuration options with default values.
        this.log = config.log || console.log; // Logger function (default: console.log).
        this.development = config.development != undefined ? config.development : (apiConfig?.development || false); // Flag for development mode.
        this.finally = config.finally || this.defaultFinalFunction; // Final cleanup function.
        this.timeout = config.timeout || 30000; // Timeout duration for shutdown operations (default: 30 seconds).

        // Initialize graceful shutdown for an HTTP server, if provided.
        if (config.server) {
            gracefulShutdown(config.server, {
                signals: 'SIGINT SIGTERM', // Signals to handle.
                timeout: this.timeout, // Maximum time to wait during shutdown.
                development: this.development, // Enable development mode if specified.
                forceExit: config.forceExit !== undefined ? config.forceExit : true, // Force process exit.
                onShutdown: this.shutdownFunction.bind(this), // Shutdown handler.
                finally: this.finally.bind(this) // Final cleanup function.
            });
        } else {
            // Manually handle signals if no HTTP server is provided.
            const once = onceFactory(); // Factory to ensure handlers run only once.

            once(process, ['SIGTERM', 'SIGINT'], async (signal) => {
                if (this.development == false) {
                    await Promise.race([wait(this.timeout), this.shutdownFunction(signal)]); // Execute shutdown logic with a timeout.
                    this.finally(); // Perform final cleanup.
                    await wait(1000); // Wait briefly before process exit.
                }
                process.exit(); // Exit the process.
            });
        }

        if (this.development == false) {
            // Log successful initialization.
            this.log('info', 'Shutdown handler successfully initialized.');
        } else {
            this.log('info', 'Shutdown handler in development mode.');
        }
    }

    /**
     * Default final cleanup function executed after the shutdown process completes.
     */
    defaultFinalFunction() {
        this.log('info', 'Server gracefully shut down.');
    }

    /**
     * Shutdown function to execute registered handlers and optionally report the shutdown.
     * @param {string} signal - The signal that triggered the shutdown (e.g., SIGTERM, SIGINT).
     * @returns {Promise<void>} Resolves after all handlers have executed.
     */
    async shutdownFunction(signal) {
        if (this.apiConfig?.apiUrl && this.apiConfig?.development == false) {
            this.reportError(signal).then(() => {
                this.log('info', 'Shutdown reported.');
            }).catch(err => {
                this.log('error', `Failed to report shutdown: ${err.message}`);
            });
        }
        this.log('info', `Received signal: ${signal}. Executing shutdown handlers.`);
        await this.executeHandlerFunctions(); // Execute all registered handlers.
        await wait(1000); // Allow pending operations to complete.
        this.log('info', 'All shutdown handlers executed successfully.');
    }

    /**
     * Execute all registered shutdown handlers sequentially.
     * @returns {Promise<boolean>} Resolves to true after handlers are executed.
     */
    async executeHandlerFunctions() {
        for (const { handler, name } of globalErrorHandlerFn) {
            const handlerName = name || "Anonymous";
            try {
                await handler(); // Execute the shutdown handler.
                this.log('info', `${handlerName} shutdown handler executed successfully.`);
            } catch (error) {
                this.log('error', `Error executing ${handlerName} shutdown handler: ${error.message}`);
            }
        }
        return true;
    }

    /**
     * Report the shutdown event to an external API, if configured.
     * @param {string} signal - The signal that triggered the shutdown.
     * @returns {Promise<void>} Resolves after the API request is completed.
     */
    async reportError(signal) {
        const options = this.apiConfig.token
            ? { headers: { Authorization: `Bearer ${this.apiConfig.token}` } }
            : {};

        return axios.post(
            `${this.apiConfig.apiUrl}/shutdown`,
            {
                service: this.apiConfig.service,
                signal,
                time: new Date()
            },
            options
        );
    }
}

/**
 * Register a new shutdown handler function.
 * @param {Function} handler - The callback function to execute during shutdown.
 * @param {string} [name] - Optional name for the shutdown handler.
 */
const addShutdownHandler = (handler, name) => {
    globalErrorHandlerFn.push({ handler, name });
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
