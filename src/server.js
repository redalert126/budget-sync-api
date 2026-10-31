import { config } from './config.js';
import { createApp } from './app.js';
import { createPool } from './db/pool.js';
import { logger } from './lib/logger.js';

// Unhandled request errors are reported to Sentry by middleware/error-handler.js.
const db = createPool(config.DATABASE_URL);
const app = createApp({ db });

const server = app.listen(config.PORT, () => logger.info({ port: config.PORT }, 'API listening'));

// Render sends SIGTERM on deploys. Stop accepting connections, finish in-flight
// requests, then close the pool so no query is cut off mid-transaction.
async function shutdown(signal) {
  logger.info({ signal }, 'shutting down');
  server.close(async () => {
    await db.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
