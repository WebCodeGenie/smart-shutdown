# smart-shutdown

A lightweight and easy-to-use Node.js package to handle graceful shutdowns for your application. Compatible with both CommonJS (CJS) and ECMAScript Modules (MJS).

## Features
- Graceful shutdown of your Node.js applications.
- Easy to integrate with existing codebases.
- Works seamlessly with both CJS and MJS module systems.

## Installation

Install the package via npm:

```bash
npm install smart-shutdown
```

Or with yarn:

```bash
yarn add smart-shutdown
```

## Usage

### Import the Package

#### For ECMAScript Modules (MJS)

```javascript
import { ShutdownHelper } from 'smart-shutdown';

const shutdown = new ShutdownHelper();

shutdown.shutdown();
```

#### For CommonJS (CJS)

```javascript
const { ShutdownHelper } = require('smart-shutdown');

const shutdown = new ShutdownHelper();

shutdown.shutdown();
```

## API

### `ShutdownHelper`

The `ShutdownHelper` class provides a mechanism to handle graceful shutdowns. It listens to system signals (e.g., `SIGINT`, `SIGTERM`) and executes cleanup operations before exiting the application.

#### Methods

- `shutdown(options)`: Initiates the graceful shutdown process. Accepts an `options` object.
- `shutdownHandlerFn(callback)`: A callback function executed before the application shuts down. This function should handle cleanup tasks and execute before the timeout expires.

## Options

| Option       | Default          | Description                                                                                                                |
|--------------|------------------|----------------------------------------------------------------------------------------------------------------------------|
| `server`     | `-`              | An HTTP server. If provided, it will close the server during shutdown, serving all pending requests but not accepting new ones. |
| `timeout`    | `30000`          | Timeout in milliseconds before forced shutdown.                                                                             |
| `development`| `false`          | If set to `true`, skips graceful shutdown to speed up the development process.                                              |
| `finally`    | `-`              | A small, non-time-consuming function to execute at the end of the shutdown process (not executed in development mode).      |
| `log`        | `-`              | A function to provide logs during the shutdown process.                                                                     |

### Example

Here is an example of using `smart-shutdown` in a typical Node.js application:

```javascript
import { ShutdownHelper, shutdownHandlerFn } from 'smart-shutdown';

const shutdown = new ShutdownHelper();

// `app` can be an HTTP, HTTPS, Express, Koa, or Fastify server, etc.
const server = app.listen(...);

shutdown.shutdown({
    server: server,
    timeout: 20000, // Custom timeout in milliseconds
    log: (level, message) => console.log(message),
    finally: () => console.log('Application has shut down gracefully.')
});

shutdownHandlerFn(() => {
    console.log('Executing cleanup tasks...');
    // Close database connections
    closeDatabaseConnection();
    // Close Redis connections
    closeRedisConnection();
    console.log('Cleanup completed.');
});

async function closeDatabaseConnection() {
    // Simulate database connection closure
    return new Promise((resolve) => setTimeout(resolve, 1000));
}

async function closeRedisConnection() {
    // Simulate Redis connection closure
    return new Promise((resolve) => setTimeout(resolve, 500));
}
```

