import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const SYNC_QUEUE = 'transaction-sync';

// BullMQ requires maxRetriesPerRequest: null on its Redis connections.
export function createRedis(url) {
  return new IORedis(url, { maxRetriesPerRequest: null });
}

export function createSyncQueue(connection) {
  return new Queue(SYNC_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: 1_000,
      removeOnFail: 5_000,
    },
  });
}

// jobId = item id: if a sync for this item is already queued, a second request is a no-op.
// This de-duplicates bursts of Plaid webhooks for the same connection.
export function enqueueSync(queue, plaidItemId) {
  return queue.add('sync', { plaidItemId }, { jobId: `sync-${plaidItemId}` });
}
