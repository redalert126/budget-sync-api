-- Up Migration

-- Money is stored as integer cents (BIGINT) to avoid floating-point rounding.
-- All tables carry user_id so every query can be scoped to the caller.

CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- API tokens are stored only as SHA-256 hashes; the raw token is shown once at creation.
CREATE TABLE api_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ
);

-- One row per bank connection. The Plaid access token is encrypted at rest (AES-256-GCM).
CREATE TABLE plaid_items (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plaid_item_id            TEXT NOT NULL UNIQUE,
  access_token_ciphertext  TEXT NOT NULL,
  institution_name         TEXT,
  sync_cursor              TEXT,
  status                   TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'login_required', 'revoked')),
  last_synced_at           TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX plaid_items_user_id_idx ON plaid_items (user_id);

CREATE TABLE accounts (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plaid_item_id          UUID NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
  plaid_account_id       TEXT NOT NULL UNIQUE,
  name                   TEXT NOT NULL,
  mask                   TEXT,
  type                   TEXT NOT NULL,
  subtype                TEXT,
  current_balance_cents  BIGINT,
  iso_currency_code      CHAR(3),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX accounts_user_id_idx ON accounts (user_id);

-- user_id NULL = built-in category shared by all users.
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (user_id, name)
);

CREATE TABLE transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id            UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plaid_transaction_id  TEXT NOT NULL UNIQUE,
  -- Plaid convention: positive = money leaving the account.
  amount_cents          BIGINT NOT NULL,
  iso_currency_code     CHAR(3),
  posted_on             DATE NOT NULL,
  name                  TEXT NOT NULL,
  merchant_name         TEXT,
  category_id           UUID REFERENCES categories(id) ON DELETE SET NULL,
  pending               BOOLEAN NOT NULL DEFAULT false,
  -- Soft delete: Plaid reports removed transactions; keep them for audit, hide from reads.
  removed_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Supports the main read path: a user's transactions, newest first, cursor-paginated.
CREATE INDEX transactions_user_posted_idx
  ON transactions (user_id, posted_on DESC, id DESC)
  WHERE removed_at IS NULL;

CREATE TABLE budgets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month        DATE NOT NULL CHECK (EXTRACT(DAY FROM month) = 1),
  limit_cents  BIGINT NOT NULL CHECK (limit_cents > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, month)
);

INSERT INTO categories (user_id, name) VALUES
  (NULL, 'Groceries'),
  (NULL, 'Dining'),
  (NULL, 'Transportation'),
  (NULL, 'Housing'),
  (NULL, 'Utilities'),
  (NULL, 'Shopping'),
  (NULL, 'Entertainment'),
  (NULL, 'Income'),
  (NULL, 'Other');

-- Down Migration

DROP TABLE budgets;
DROP TABLE transactions;
DROP TABLE categories;
DROP TABLE accounts;
DROP TABLE plaid_items;
DROP TABLE api_tokens;
DROP TABLE users;
