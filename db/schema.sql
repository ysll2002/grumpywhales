-- ─────────────────────────────────────────────────────────────────────────
-- GrumpyWhales — initial schema
-- Run this once in Supabase SQL Editor after creating the project.
-- ─────────────────────────────────────────────────────────────────────────

-- profiles: account-level user data, linked to NextAuth session via id
CREATE TABLE IF NOT EXISTS profiles (
  id                          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email                       TEXT         UNIQUE NOT NULL,
  name                        TEXT,
  password_hash               TEXT,        -- NULL when Google-only sign-in
  avatar_url                  TEXT,
  company_name                TEXT,
  business_address            TEXT,
  vat_number                  TEXT,
  default_currency            TEXT         NOT NULL DEFAULT 'GBP',
  default_payment_terms_days  INT          NOT NULL DEFAULT 14,
  default_chase_after_days    INT          NOT NULL DEFAULT 7,    -- days after due_date before first chase
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- clients: the user's customers (people / companies they invoice)
CREATE TABLE IF NOT EXISTS clients (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT         NOT NULL,
  email           TEXT         NOT NULL,
  company_name    TEXT,
  billing_address TEXT,
  notes           TEXT,
  archived        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- invoices: the core unit
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID           NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id       UUID           NOT NULL REFERENCES clients(id)  ON DELETE RESTRICT,
  invoice_number  TEXT           NOT NULL,                -- e.g. INV-2026-0001
  amount          NUMERIC(14, 2) NOT NULL,                -- subtotal incl. VAT
  currency        TEXT           NOT NULL DEFAULT 'GBP',
  vat_amount      NUMERIC(14, 2) NOT NULL DEFAULT 0,
  reference       TEXT,                                   -- shown to client as payment reference; we match on this
  status          TEXT           NOT NULL DEFAULT 'draft',-- draft|sent|paid|overdue|cancelled
  issue_date      DATE           NOT NULL,
  due_date        DATE           NOT NULL,
  paid_at         TIMESTAMPTZ,
  paid_via        TEXT,                                   -- plaid|manual
  matched_transaction_id UUID,                            -- FK fill-in after reconciliation
  description     TEXT,
  line_items      JSONB,                                  -- [{description, quantity, unit_price}]
  notes           TEXT,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, invoice_number)
);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id   ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status    ON invoices(status, due_date);

-- invoice_emails: audit log of every email we send for an invoice
CREATE TABLE IF NOT EXISTS invoice_emails (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID         NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  type        TEXT         NOT NULL,    -- 'invoice_sent' | 'chase_1' | 'chase_2' | 'chase_3' | 'thank_you'
  sent_to     TEXT         NOT NULL,
  sent_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  resend_id   TEXT,                     -- Resend message id, for tracking
  opened      BOOLEAN      NOT NULL DEFAULT FALSE,
  opened_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_invoice_emails_invoice_id ON invoice_emails(invoice_id);

-- bank_connections: Plaid connection(s) per user
CREATE TABLE IF NOT EXISTS bank_connections (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plaid_item_id       TEXT         NOT NULL UNIQUE,
  plaid_access_token  TEXT         NOT NULL,    -- server-side only, never exposed via RLS
  institution_name    TEXT,
  last_synced_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_connections_user_id ON bank_connections(user_id);

-- transactions: every transaction we pull from Plaid, with optional invoice match
CREATE TABLE IF NOT EXISTS transactions (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID           NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bank_connection_id    UUID           NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
  plaid_transaction_id  TEXT           NOT NULL UNIQUE,
  amount                NUMERIC(14, 2) NOT NULL,     -- positive = money IN to the user (we flip Plaid's sign on ingest)
  currency              TEXT           NOT NULL,
  date                  DATE           NOT NULL,
  description           TEXT,
  counterparty          TEXT,                        -- sender / merchant name
  matched_invoice_id    UUID REFERENCES invoices(id),
  created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date  ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_matched    ON transactions(matched_invoice_id) WHERE matched_invoice_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS: enable on every table, no policies → only service_role can read/write.
-- All app traffic goes through API routes using SUPABASE_SERVICE_ROLE_KEY.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_emails   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions     ENABLE ROW LEVEL SECURITY;
