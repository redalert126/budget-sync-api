import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

// These use a fake db, so they run without Postgres.
const healthyDb = { query: async () => ({ rows: [{ '?column?': 1 }] }) };
const brokenDb = {
  query: async () => {
    throw new Error('connection refused');
  },
};

describe('health checks', () => {
  it('GET /health is ok without touching the database', async () => {
    const res = await request(createApp({ db: brokenDb })).get('/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });

  it('GET /ready is 200 when the database responds', async () => {
    const res = await request(createApp({ db: healthyDb })).get('/ready');
    assert.equal(res.status, 200);
  });

  it('GET /ready is 503 when the database is down', async () => {
    const res = await request(createApp({ db: brokenDb })).get('/ready');
    assert.equal(res.status, 503);
  });

  it('unknown routes return a JSON 404', async () => {
    const res = await request(createApp({ db: healthyDb })).get('/nope');
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: 'Not found' });
  });
});
