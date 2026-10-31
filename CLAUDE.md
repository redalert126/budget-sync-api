# Notes for Claude Code

Node 22 + Express 5 + Postgres 16 + Redis/BullMQ backend for a personal finance app. ES modules, plain JavaScript.

## Commands
- `npm run dev` / `npm run worker:dev` — run API / worker with `.env`
- `npm test` — node:test; integration tests use `.env.test` (budget_test DB) and skip if DATABASE_URL is unset
- `npm run lint`
- `npm run migrate:create -- <name> -j sql`, `npm run migrate:up`, `npm run migrate:down`

## Rules
- Every query on user data is scoped by `req.userId`. Never trust ids from the client without that filter.
  Another user's resource returns 404, not 403.
- Money is integer cents (`*_cents`, BIGINT). Convert Plaid decimals once with `Math.round(amount * 100)`.
- Never log or return Plaid access tokens, API tokens or `Authorization` headers. Access tokens are stored only
  through `src/lib/crypto.js`.
- Validate request input with zod via `middleware/validate.js`; handlers read `req.valid`, not `req.body`.
- Throw `HttpError` (src/lib/errors.js) for client errors; let everything else reach the error handler.
- Migrations are SQL files with both `-- Up Migration` and `-- Down Migration`. Never edit a migration that has
  run in production; add a new one. Data migrations on large tables run in batches.
- Multi-statement writes use `withTransaction` from `src/db/pool.js`.
- New endpoints come with integration tests, including an authorization test (user A can't see user B's data).
- Keep changes small and explain non-obvious decisions in code comments or docs/decisions.md.

## Working style
The owner of this repo must be able to explain every line. Prefer clear code over clever code, and when
proposing a change, say why in a sentence or two.
