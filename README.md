# budget-sync-api

A personal finance backend: connects bank accounts through Plaid, keeps transactions in sync in the background,
and tracks monthly budgets by category. Built with Node, Express, Postgres and Redis, deployed on Render.

> **Status:** in progress. See [PLAN.md](PLAN.md). Sections marked _TODO_ are filled in as features land.

## Architecture

```mermaid
flowchart LR
  client[Mobile app / API client] -->|Bearer token| api[Express API]
  plaid[(Plaid)] -->|webhook: updates available| api
  api -->|enqueue sync| redis[(Redis / BullMQ)]
  redis --> worker[Sync worker]
  worker -->|/transactions/sync| plaid
  api --> pg[(Postgres)]
  worker --> pg
  api -. errors .-> sentry[Sentry]
  worker -. errors .-> sentry
```

- **API** (`src/app.js`) serves authenticated, user-scoped reads and writes.
- **Worker** (`src/worker.js`) runs transaction syncs off the request path, with retries and per-item de-duplication.
- **Postgres** is the source of truth. Money is integer cents; Plaid access tokens are encrypted at rest.

## Running locally

Requires Node 22+ and Docker.

```bash
npm install
docker compose up -d                 # Postgres 16 + Redis 7 (also creates budget_test)
cp .env.example .env                 # then fill in TOKEN_ENCRYPTION_KEY and Plaid sandbox keys
cp .env.test.example .env.test
npm run migrate:up                   # dev database
DATABASE_URL=postgres://budget:budget@localhost:5432/budget_test npm run migrate:up
npm run create-user -- you@example.com   # prints an API token
npm run dev                          # API on :3000
npm run worker:dev                   # sync worker, in a second terminal
npm test
```

## API

All `/v1` routes take `Authorization: Bearer <token>`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness (no dependencies) |
| GET | `/ready` | Readiness (checks Postgres) |
| GET | `/v1/accounts` | The caller's linked accounts |
| _TODO_ | `/v1/plaid/*` | Link a bank |
| _TODO_ | `/v1/transactions` | List / recategorize transactions |
| _TODO_ | `/v1/budgets` | Monthly budgets and spend |

## Security and privacy

- Plaid access tokens are encrypted with AES-256-GCM before storage; the key lives only in the environment.
- API tokens are stored as SHA-256 hashes and can be revoked.
- Every query is scoped by the authenticated user's id; tests check that one user cannot read another's data.
- Logs redact authorization headers and tokens; Sentry is configured to send no PII.
- Input is validated with zod at the edge; unexpected errors return a generic 500 and are reported to Sentry.
- _TODO:_ webhook signature verification, rate limiting.

## Design decisions

Build-vs-buy and architecture choices are recorded in [docs/decisions.md](docs/decisions.md).

## How I used AI tools

_TODO: fill in from NOTES.md during the build: how Claude Code was used to plan, write, test and review;
one or two concrete examples of where its output was wrong or incomplete and how that was caught._

## Known gaps

_TODO: list honestly before applying._
