# Decision log

Short records of choices that shaped the system. Rewrite these in your own words and add new ones as you go.

## ADR-001: Buy bank connectivity (Plaid) rather than build CSV/OFX import

**Context.** Users need their transactions in the app with minimal effort.
**Options.** (a) CSV/OFX upload, built in-house; (b) an aggregator such as Plaid.
**Decision.** Plaid.
**Why.** Bank auth, MFA, institution coverage and data normalization are a large, ongoing maintenance burden
that isn't this product's differentiator. CSV import puts the work on the user and goes stale immediately.
**Cost.** Per-connection fees, vendor dependency, and handling their failure modes (expired logins, webhook delays).
**Revisit if.** Pricing changes materially, or a user segment needs institutions Plaid doesn't cover.

## ADR-002: Sync in a background worker, not in the request

**Decision.** Plaid syncs run in a BullMQ worker backed by Redis; API requests only enqueue.
**Why.** A sync can take many paginated calls; doing it in a request risks timeouts and duplicate work.
A queue gives retries with backoff, and a job id per item de-duplicates webhook bursts.
**Cost.** One more service (Redis) and process to run and monitor.

## ADR-003: Store money as integer cents

**Decision.** `BIGINT` cents everywhere; conversion from Plaid's decimal amounts happens once, at ingestion.
**Why.** Floating-point sums drift; cents make budget arithmetic exact and comparisons safe.

## ADR-004: Simple hashed API tokens instead of a full auth provider (for now)

**Decision.** Bearer tokens, stored hashed, issued by a CLI script.
**Why.** The project's focus is the data and sync layer. Tokens are enough to enforce per-user isolation and are easy to revoke.
**In production** I would buy auth (e.g. Clerk, Auth0, Supabase Auth) rather than build passwords, sessions and MFA.
