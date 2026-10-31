import * as Sentry from '@sentry/node';
import { HttpError } from '../lib/errors.js';

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Not found' });
}

// Express 5 forwards rejected promises from async handlers here automatically.
export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details && { details: err.details }) });
  }
  // Malformed JSON body from express.json()
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  req.log?.error({ err }, 'unhandled error');
  Sentry.captureException(err);
  res.status(500).json({ error: 'Internal server error' });
}
