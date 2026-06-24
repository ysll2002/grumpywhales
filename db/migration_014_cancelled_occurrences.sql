-- ─────────────────────────────────────────────────────────────────────────
-- migration_014 — cancel a single occurrence of a recurring event
-- Run this once in the Supabase SQL Editor on top of migration 013.
-- ─────────────────────────────────────────────────────────────────────────
-- We use a DATE[] on events instead of a separate table because the set is
-- small (a handful of dates per series at most) and the query pattern is
-- always 'is this date cancelled?' for a known event.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS cancelled_dates DATE[] NOT NULL DEFAULT '{}';
