-- ─────────────────────────────────────────────────────────────────────────
-- migration_016 — drop Plaid-era tables
-- Run this once in the Supabase SQL Editor after migration 015.
-- ─────────────────────────────────────────────────────────────────────────
-- bank_connections + transactions were used by the Plaid auto-match flow
-- (invoicing era). Stripe handles event payments now; nothing reads or
-- writes these tables anymore.

DROP TABLE IF EXISTS transactions     CASCADE;
DROP TABLE IF EXISTS bank_connections CASCADE;

-- invoices.matched_transaction_id was a soft FK to transactions (no real
-- constraint, just a column). Drop the column so the schema reflects the
-- new reality.
ALTER TABLE invoices DROP COLUMN IF EXISTS matched_transaction_id;
ALTER TABLE invoices DROP COLUMN IF EXISTS paid_via;
