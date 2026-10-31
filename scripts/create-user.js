// Usage: npm run create-user -- you@example.com
// Creates the user if needed and prints a new API token. The token is shown once and stored only as a hash.
import pg from 'pg';
import { generateToken, hashToken } from '../src/lib/crypto.js';

const email = process.argv[2];
if (!email) {
  console.error('Usage: npm run create-user -- <email>');
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const token = generateToken();
  await client.query('BEGIN');
  const { rows } = await client.query(
    `INSERT INTO users (email) VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`,
    [email],
  );
  await client.query('INSERT INTO api_tokens (user_id, token_hash) VALUES ($1, $2)', [rows[0].id, hashToken(token)]);
  await client.query('COMMIT');
  console.log(`User ${email} (${rows[0].id})\nAPI token (save it now, it is not stored): ${token}`);
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  await client.end();
}
