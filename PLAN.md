# Build plan: 5 days to application

Goal: apply to Commons by **Wednesday, Nov 4** with a deployed, tested backend you can explain line by line.
Days 1–2 fall on the weekend (about 6–8 focused hours each). Days 3–5 are workdays, so they're scoped
for an evening (about 3–4 hours). If a day runs long, cut from the **Stretch** items, never from tests or the README.

**Fallback:** if you're behind by the end of Day 3, apply anyway on Day 4 with what's deployed. A working
link-and-sync backend with honest "known gaps" beats a later application.

The rule for every day: **you must be able to explain every line that ships.** Use Claude Code to write and review,
but read each diff before you commit it. In an interview, "Claude wrote that part" is a bad answer; "I had Claude
draft it, then I changed X because Y" is a great one. Keep a running `NOTES.md` (gitignored or not) of those
moments; it becomes your README's AI-workflow section and your application answer.

---

## Day 1 — Sat Oct 31: running locally, CI green, deployed

Starting midday, so if you run out of time, push the Render deploy to the start of Day 2.

**Setup (≈1.5 h)**
1. Install Node 22, Docker Desktop, and the GitHub CLI if you don't have them.
2. Create the GitHub repo: `gh repo create budget-sync-api --public --source=. --push` (after `git init` and a first commit).
3. Install dependencies and commit the lockfile:
   ```
   npm install express pg node-pg-migrate ioredis bullmq zod pino pino-http helmet @sentry/node plaid
   npm install -D supertest eslint @eslint/js globals
   ```
4. `docker compose up -d`, copy `.env.example` → `.env` and `.env.test.example` → `.env.test`, generate the encryption key.
5. `npm run migrate:up`, then the same against the test DB, then `npm test` and `npm run lint`. Fix anything that fails;
   this scaffold was written without being able to install packages, so expect a small fix or two.

**Understand the scaffold (≈2 h)** — don't skip this.
- Read every file in `src/`, `migrations/`, `test/`. For each, be able to answer: why is this here, what breaks without it?
- Ask Claude Code to quiz you on the schema and the auth middleware. Change anything you disagree with.

**Ship it (≈2–3 h)**
- Push; get the GitHub Actions run green. Add a branch-protection rule requiring CI on `main`.
- Get Plaid sandbox keys (dashboard.plaid.com, free).
- Create a Sentry project (free) and add the DSN to `.env`; throw a test error to confirm it arrives.
- Deploy with the Render Blueprint (`render.yaml`). Set secrets in the dashboard, run migrations from the Render shell,
  confirm `/ready` returns 200 on the public URL.

**Done when:** CI is green on GitHub, `/ready` is 200 on Render, a Sentry test event exists.

---

## Day 2 — Sun Nov 1: Plaid integration and transaction sync (the core)

This is the hardest day; it gets a full weekend day on purpose.

1. **Link flow** (`src/routes/plaid.js`)
   - `POST /v1/plaid/link-token` → Plaid `/link/token/create`.
   - `POST /v1/plaid/exchange` → exchange `public_token`, encrypt the access token with `src/lib/crypto.js`,
     insert `plaid_items`, fetch and upsert `accounts`, enqueue an initial sync.
   - For testing without a UI, use Plaid's `/sandbox/public_token/create` to mint a public token. Add a
     `scripts/sandbox-link.js` that does the whole flow from the command line.
2. **Migration 2**: add `transactions.plaid_category TEXT` (Plaid's `personal_finance_category.primary`).
   Written with `npm run migrate:create -- add-plaid-category -j sql`.
3. **Sync job** (`src/jobs/sync-transactions.js`): implement the six requirements written in that file.
   This is the part interviewers will dig into. Know why the cursor is saved in the same transaction.
4. **Tests** for sync with a fake Plaid client (no network): first sync inserts; re-running the same page is
   idempotent; `modified` updates; `removed` soft-deletes; `ITEM_LOGIN_REQUIRED` marks the item and stops retrying.

**Done when:** from the command line you can link a sandbox bank, see transactions in Postgres, and the sync
tests pass in CI.

---

## Day 3 — Mon Nov 2 (evening): reading transactions and the webhook

1. **`GET /v1/transactions`**: filters (`account_id`, `from`, `to`, `category_id`), keyset pagination on
   `(posted_on, id)` (explain why not `OFFSET`), validated with zod via `middleware/validate.js`.
   Tests for each filter, pagination across pages, and user isolation.
2. **Webhook** `POST /plaid/webhook` (outside `/v1` auth): on `SYNC_UPDATES_AVAILABLE`, enqueue a sync.
   Verify the `Plaid-Verification` JWT, since the endpoint is public. If time is short, note it as a known gap
   in the README rather than skipping silently.
3. Deploy and run the sandbox link against production; confirm a sync job's errors (if any) show up in Sentry.

**Done when:** transactions are listable through the deployed API and new ones arrive via the webhook.

---

## Day 4 — Tue Nov 3 (evening): budgets, a data migration, and the mobile client

If the evening runs short, do items 1–3 and move the mobile screen to the start of Day 5.

1. **Migration 3: a data migration on existing rows.** Map `plaid_category` to `category_id` for every existing
   transaction (e.g. `FOOD_AND_DRINK_GROCERIES` → Groceries). Do it in batches with an `UPDATE ... WHERE id IN
   (SELECT ... LIMIT 1000)` loop so it wouldn't lock a large live table. Write a real down migration.
   This is the "migrations on systems people were actively using" talking point. Write in the README how you would
   roll it out on a live table.
2. **Budgets**: `PUT /v1/budgets/:month/:categoryId` (upsert), `GET /v1/budgets/:month` returning limit, spent and
   remaining per category in **one SQL query** (aggregate in Postgres, not in JS). Tests for the math, including
   refunds (negative amounts) and removed transactions.
3. **`PATCH /v1/transactions/:id`** to recategorize. Return 404, not 403, for another user's transaction
   (don't confirm it exists).
4. **Mobile** (`mobile/`, time-box to 2 hours): `npx create-expo-app@latest mobile`, one screen that lists
   transactions from the deployed API with a token pasted into config. Ugly is fine. A screenshot in the README is enough.
5. **Stretch:** Redis-backed rate limiting on the API; a Sentry alert rule; `GET /v1/budgets/:month` cached in Redis
   with invalidation on transaction change.

**Done when:** budgets work end to end on the deployed API, the data migration has run in production, and the
mobile screen shows real (sandbox) data.

---

## Day 5 — Wed Nov 4 (evening): polish and apply

If the evening is tight, do items 1, 5 and 6 tonight and the rest after you apply; reviewers won't look for a day or two.

1. **README** (≈2 h): fill in the AI-workflow section from your `NOTES.md`, add the mobile screenshot, list known
   gaps honestly. Reviewers read the README before the code.
2. **Decisions** (`docs/decisions.md`): rewrite each ADR in your own words. Add any decision you made during the build.
3. **Self-review with fresh eyes**: ask Claude Code to review the whole repo as a skeptical senior backend
   engineer (security, correctness, missing tests). Fix the real findings; record the ones you chose not to fix.
4. **Clean history**: meaningful commit messages and at least a few PRs merged through CI, so the repo shows how you work.
5. **Resume**: add the project to the Projects section (Node/Express, Postgres, Redis, Plaid, GitHub Actions, Sentry, Render).
6. **Apply.** Draft the three written answers:
   - *How do you use AI agents?* → from `NOTES.md`, one concrete example.
   - *Most substantial Node/Express backend?* → this project, honestly framed, plus a pivot to the production
     systems you've owned at Kutta.
   - *Why Commons?* → your own reason; their product is a personal finance app, and you just built its backend shape.

**Done when:** application submitted.
