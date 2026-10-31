import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

// Build vs. buy: see docs/decisions.md (ADR-001). Plaid handles bank auth, MFA and
// institution coverage; building that ourselves is not a credible option for a small team.
export function createPlaidClient({ clientId, secret, env }) {
  if (!clientId || !secret) throw new Error('PLAID_CLIENT_ID and PLAID_SECRET are required');
  return new PlaidApi(
    new Configuration({
      basePath: PlaidEnvironments[env],
      baseOptions: { headers: { 'PLAID-CLIENT-ID': clientId, 'PLAID-SECRET': secret } },
    }),
  );
}
