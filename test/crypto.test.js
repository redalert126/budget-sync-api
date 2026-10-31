import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { decrypt, encrypt, generateToken, hashToken } from '../src/lib/crypto.js';

const key = randomBytes(32).toString('base64');

describe('encrypt/decrypt', () => {
  it('round-trips a value', () => {
    const secret = 'access-sandbox-1234-abcd';
    assert.equal(decrypt(encrypt(secret, key), key), secret);
  });

  it('produces different ciphertext each time (random IV)', () => {
    assert.notEqual(encrypt('same', key), encrypt('same', key));
  });

  it('rejects tampered ciphertext', () => {
    const parts = encrypt('secret', key).split('.');
    const body = Buffer.from(parts[3], 'base64url');
    body[0] ^= 0xff;
    parts[3] = body.toString('base64url');
    assert.throws(() => decrypt(parts.join('.'), key));
  });

  it('rejects the wrong key', () => {
    const other = randomBytes(32).toString('base64');
    assert.throws(() => decrypt(encrypt('secret', key), other));
  });

  it('rejects a key that is not 32 bytes', () => {
    assert.throws(() => encrypt('secret', randomBytes(16).toString('base64')), /32 bytes/);
  });
});

describe('tokens', () => {
  it('hashes deterministically and never returns the raw token', () => {
    const token = generateToken();
    assert.equal(hashToken(token), hashToken(token));
    assert.notEqual(hashToken(token), token);
    assert.match(hashToken(token), /^[0-9a-f]{64}$/);
  });
});
