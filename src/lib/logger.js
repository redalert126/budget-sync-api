import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // Keep secrets and financial identifiers out of logs even if someone logs a whole object.
  redact: {
    paths: [
      'req.headers.authorization',
      '*.access_token',
      '*.accessToken',
      '*.public_token',
      '*.token',
    ],
    censor: '[redacted]',
  },
});
