import { Worker } from 'bullmq';
import * as Sentry from '@sentry/node';
import { config } from './config.js';
import { createPool } from './db/pool.js';
import { createPlaidClient } from './lib/plaid.js';
import { logger } from './lib/logger.js';
import { SYNC_QUEUE, createRedis } from './jobs/queue.js';
import { syncTransactions } from './jobs/sync-transactions.js';

const db = createPool(config.DATABASE_URL);
const plaid = createPlaidClient({
  clientId: config.PLAID_CLIENT_ID,
  secret: config.PLAID_SECRET,
  env: config.PLAID_ENV,
});
const deps = { db, plaid, encryptionKey: config.TOKEN_ENCRYPTION_KEY, logger };

const worker = new Worker(SYNC_QUEUE, (job) => syncTransactions(deps, job.data), {
  connection: createRedis(config.REDIS_URL),
  concurrency: 5,
});

worker.on('completed', (job) => logger.info({ jobId: job.id }, 'sync completed'));
worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, attempts: job?.attemptsMade, err }, 'sync failed');
  Sentry.captureException(err, { tags: { queue: SYNC_QUEUE } });
});
logger.info('worker started');

async function shutdown() {
  await worker.close(); // waits for in-flight jobs
  await db.end();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
