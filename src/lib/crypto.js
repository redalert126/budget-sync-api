import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

// AES-256-GCM: authenticated encryption, so tampered ciphertext fails to decrypt
// instead of silently producing garbage. Output format: v1.<iv>.<authTag>.<ciphertext>, base64url.
const VERSION = 'v1';
const IV_BYTES = 12;

function toKey(keyBase64) {
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) throw new Error('Encryption key must be 32 bytes');
  return key;
}

export function encrypt(plaintext, keyBase64) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', toKey(keyBase64), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, ciphertext].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join('.');
}

export function decrypt(payload, keyBase64) {
  const [version, iv, tag, ciphertext] = payload.split('.');
  if (version !== VERSION || !iv || !tag || !ciphertext) throw new Error('Unrecognized ciphertext format');
  const decipher = createDecipheriv('aes-256-gcm', toKey(keyBase64), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
}

// API tokens are high-entropy random values, so a fast hash (not bcrypt) is appropriate.
export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function generateToken() {
  return randomBytes(32).toString('base64url');
}
