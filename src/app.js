import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { logger } from './lib/logger.js';
import { requireUser } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { healthRoutes } from './routes/health.js';
import { accountRoutes } from './routes/accounts.js';

// Dependencies are passed in rather than imported, so tests can supply a test
// database (or a fake) without touching module state.
export function createApp({ db }) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  app.use(healthRoutes({ db }));

  // Everything below requires a valid API token.
  const v1 = express.Router();
  v1.use(requireUser(db));
  v1.use('/accounts', accountRoutes({ db }));
  // Day 2: v1.use('/plaid', plaidRoutes({ db, plaid, queue }));
  // Day 2: v1.use('/transactions', transactionRoutes({ db }));
  // Day 3: v1.use('/budgets', budgetRoutes({ db }));
  app.use('/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
