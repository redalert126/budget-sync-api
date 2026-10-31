import { hashToken } from '../lib/crypto.js';
import { unauthorized } from '../lib/errors.js';

// Bearer-token auth. The token is hashed before lookup, so a database leak
// does not expose usable credentials. Sets req.userId for downstream handlers.
export function requireUser(db) {
  return async (req, _res, next) => {
    const header = req.get('authorization') ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return next(unauthorized());

    const { rows } = await db.query(
      `UPDATE api_tokens SET last_used_at = now()
        WHERE token_hash = $1 AND revoked_at IS NULL
        RETURNING user_id`,
      [hashToken(token)],
    );
    if (rows.length === 0) return next(unauthorized());

    req.userId = rows[0].user_id;
    next();
  };
}
