import { Router } from 'express';

export function healthRoutes({ db }) {
  const router = Router();

  // Liveness: the process is up. Never touches dependencies, so it can't cascade failures.
  router.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Readiness: dependencies are reachable. Use this for Render's health check.
  router.get('/ready', async (_req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });

  return router;
}
