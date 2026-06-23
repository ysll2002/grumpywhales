-- ─────────────────────────────────────────────────────────────────────────
-- migration_006_signups — attendee sign-ups + sign-up mode + capacity
-- Run this once in the Supabase SQL Editor on top of migrations 004/005.
-- ─────────────────────────────────────────────────────────────────────────

-- Extend events with sign-up policy + capacity.
-- signup_mode: 'first_come' (auto-accept until capacity), 'curated' (admin approves)
-- capacity:    NULL = unlimited
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS signup_mode TEXT NOT NULL DEFAULT 'first_come',
  ADD COLUMN IF NOT EXISTS capacity    INT;

-- event_signups: one row per (event, profile) pair.
-- status:
--   accepted   — confirmed on the roster (first_come auto or curated approved)
--   pending    — curated, waiting for admin decision
--   waitlisted — first_come past capacity (P3 will populate; P1 just leaves room)
--   declined   — curated, admin rejected
--   cancelled  — attendee withdrew or admin removed
-- payment_status:
--   free   — event has no fee
--   unpaid — paid event, not yet paid (P2 will move this to 'paid' via Stripe webhook)
--   paid   — payment confirmed
CREATE TABLE IF NOT EXISTS event_signups (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID         NOT NULL REFERENCES events(id)    ON DELETE CASCADE,
  profile_id      UUID         NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  status          TEXT         NOT NULL DEFAULT 'pending',
  payment_status  TEXT         NOT NULL DEFAULT 'free',
  signed_up_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, profile_id)
);
CREATE INDEX IF NOT EXISTS idx_event_signups_event   ON event_signups(event_id);
CREATE INDEX IF NOT EXISTS idx_event_signups_profile ON event_signups(profile_id);

ALTER TABLE event_signups ENABLE ROW LEVEL SECURITY;
-- RLS policies intentionally empty — all access via service_role through API routes.
