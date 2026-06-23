-- ─────────────────────────────────────────────────────────────────────────
-- migration_011 — track when the attendee list was emailed out
-- Run this once in the Supabase SQL Editor on top of migration 010.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS attendees_published_at TIMESTAMPTZ;
