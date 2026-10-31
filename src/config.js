import { z } from 'zod';

// Validate configuration once at startup so a missing secret fails fast and loudly,
// instead of surfacing as a confusing error on the first request that needs it.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, 'must be 32 bytes, base64-encoded'),
  PLAID_CLIENT_ID: z.string().default(''),
  PLAID_SECRET: z.string().default(''),
  PLAID_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  SENTRY_DSN: z.string().default(''),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`Invalid configuration:\n${problems}`);
  process.exit(1);
}

export const config = Object.freeze(parsed.data);
