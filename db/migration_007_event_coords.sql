-- ─────────────────────────────────────────────────────────────────────────
-- migration_007_event_coords — store geocoded coordinates with each event
-- Run this once in the Supabase SQL Editor on top of migration 006.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS lat NUMERIC(9, 6),   -- -90 to 90
  ADD COLUMN IF NOT EXISTS lng NUMERIC(9, 6);   -- -180 to 180
