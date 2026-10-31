// Loaded with `node --import` before anything else so Sentry can instrument Express and pg.
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
    // Financial data: never attach request bodies, cookies or IP addresses to events.
    sendDefaultPii: false,
  });
}
