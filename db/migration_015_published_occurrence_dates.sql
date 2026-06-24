-- ─────────────────────────────────────────────────────────────────────────
-- migration_015 — per-occurrence publish state
-- Run this once in the Supabase SQL Editor on top of migration 014.
-- ─────────────────────────────────────────────────────────────────────────
-- Each session of a recurring event is published independently. Track which
-- occurrence dates have had their final attendee list sent out so the public
-- page can show 'final list to be published' until then.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS published_occurrence_dates DATE[] NOT NULL DEFAULT '{}';
