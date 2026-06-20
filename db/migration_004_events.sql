-- ─────────────────────────────────────────────────────────────────────────
-- migration_004_events — pivot to paid-event hosting
-- Run this once in the Supabase SQL Editor on top of the existing schema.
-- Existing invoicing tables remain (clients, invoices, transactions etc.)
-- so legacy data is preserved during the pivot.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
  id                       UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id                 UUID            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title                    TEXT            NOT NULL,
  description              TEXT,
  starts_at                TIMESTAMPTZ     NOT NULL,
  ends_at                  TIMESTAMPTZ,
  location                 TEXT,
  fee_amount               NUMERIC(10, 2)  NOT NULL DEFAULT 0,
  fee_currency             TEXT            NOT NULL DEFAULT 'GBP',
  status                   TEXT            NOT NULL DEFAULT 'draft',     -- draft | published | closed | cancelled
  payment_reference        TEXT            UNIQUE,                       -- e.g. GW-EVT-AB12X9, generated on insert
  created_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_admin  ON events(admin_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status, starts_at);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
