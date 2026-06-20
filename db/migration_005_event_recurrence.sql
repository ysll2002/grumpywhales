-- ─────────────────────────────────────────────────────────────────────────
-- migration_005_event_recurrence — add recurrence cadence to events
-- Run this once in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT 'none';

-- Valid values: 'none' | 'daily' | 'weekly' | 'monthly'
-- Enforce at the application layer (mirrors the `status` column pattern).
