import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createUserWithToken, hasDb, resetDb, testPool } from './helpers/db.js';

describe('GET /v1/accounts', { skip: !hasDb && 'DATABASE_URL not set' }, () => {
  let db;
  let app;

  before(() => {
    db = testPool();
    app = createApp({ db });
  });
  beforeEach(() => resetDb(db));
  after(() => db.end());

  async function addAccount(userId, name) {
    const { rows } = await db.query(
      `INSERT INTO plaid_items (user_id, plaid_item_id, access_token_ciphertext, institution_name)
       VALUES ($1, $2, 'v1.x.x.x', 'Test Bank') RETURNING id`,
      [userId, `item-${name}-${userId}`],
    );
    await db.query(
      `INSERT INTO accounts (user_id, plaid_item_id, plaid_account_id, name, type)
       VALUES ($1, $2, $3, $4, 'depository')`,
      [userId, rows[0].id, `acct-${name}-${userId}`, name],
    );
  }

  it('rejects requests without a token', async () => {
    const res = await request(app).get('/v1/accounts');
    assert.equal(res.status, 401);
  });

  it('rejects an unknown token', async () => {
    const res = await request(app).get('/v1/accounts').set('Authorization', 'Bearer not-a-real-token');
    assert.equal(res.status, 401);
  });

  it('returns only the caller’s accounts', async () => {
    const alice = await createUserWithToken(db, 'alice@example.com');
    const bob = await createUserWithToken(db, 'bob@example.com');
    await addAccount(alice.userId, 'Alice Checking');
    await addAccount(bob.userId, 'Bob Savings');

    const res = await request(app).get('/v1/accounts').set('Authorization', `Bearer ${alice.token}`);

    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.data.map((a) => a.name),
      ['Alice Checking'],
    );
  });

  it('rejects a revoked token', async () => {
    const { userId, token } = await createUserWithToken(db);
    await db.query('UPDATE api_tokens SET revoked_at = now() WHERE user_id = $1', [userId]);
    const res = await request(app).get('/v1/accounts').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 401);
  });
});
