import pg from 'pg';
import { logger } from '../lib/logger.js';

// Return BIGINT (cents) as JS numbers. Safe up to 2^53 cents (~$90 trillion).
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));
// Return DATE as 'YYYY-MM-DD' strings, not JS Dates shifted by the server's time zone.
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);

export function createPool(connectionString) {
  // TLS is controlled by the URL (append ?sslmode=require for external connections).
  // Render's internal connection string stays on its private network and needs none.
  const pool = new pg.Pool({ connectionString, max: 10 });
  pool.on('error', (err) => logger.error({ err }, 'idle Postgres client error'));
  return pool;
}

// Run fn inside a transaction; commits on success, rolls back on any thrown error.
export async function withTransaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
