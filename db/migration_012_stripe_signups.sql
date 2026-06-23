-- ─────────────────────────────────────────────────────────────────────────
-- migration_012 — Stripe payment fields on event_signups
-- Run this once in the Supabase SQL Editor on top of migration 011.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE event_signups
  ADD COLUMN IF NOT EXISTS stripe_session_id        TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_at                  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_event_signups_stripe_session
  ON event_signups(stripe_session_id);
