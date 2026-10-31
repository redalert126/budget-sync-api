import { createPool } from '../../src/db/pool.js';
import { generateToken, hashToken } from '../../src/lib/crypto.js';

// Integration tests run against a real Postgres (budget_test locally, a service container in CI).
// They skip, rather than fail, when no database is configured.
export const hasDb = Boolean(process.env.DATABASE_URL);

export function testPool() {
  return createPool(process.env.DATABASE_URL);
}

// Delete all user data but keep the built-in categories.
// DELETE (not TRUNCATE ... CASCADE): TRUNCATE cascades to every table that references users,
// which would empty the whole categories table, built-ins included. DELETE follows the
// ON DELETE CASCADE foreign keys row by row, so only rows owned by a user go.
export async function resetDb(db) {
  await db.query('DELETE FROM users');
}

export async function createUserWithToken(db, email = `user-${Date.now()}@example.com`) {
  const token = generateToken();
  const { rows } = await db.query('INSERT INTO users (email) VALUES ($1) RETURNING id', [email]);
  await db.query('INSERT INTO api_tokens (user_id, token_hash) VALUES ($1, $2)', [rows[0].id, hashToken(token)]);
  return { userId: rows[0].id, token };
}
