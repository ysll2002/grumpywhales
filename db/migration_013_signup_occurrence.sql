-- ─────────────────────────────────────────────────────────────────────────
-- migration_013 — make event_signups per-occurrence for recurring events
-- Run this once in the Supabase SQL Editor on top of migration 012.
-- ─────────────────────────────────────────────────────────────────────────

-- 1) Add the column, back-fill existing rows to the event's first occurrence
--    so the NOT NULL switch doesn't fail, then make it required.
ALTER TABLE event_signups ADD COLUMN IF NOT EXISTS occurrence_date DATE;

UPDATE event_signups s
SET occurrence_date = (e.starts_at AT TIME ZONE 'UTC')::date
FROM events e
WHERE s.event_id = e.id AND s.occurrence_date IS NULL;

ALTER TABLE event_signups ALTER COLUMN occurrence_date SET NOT NULL;

-- 2) Replace the (event_id, profile_id) unique with (event_id, profile_id, occurrence_date).
--    Constraint name from the original inline UNIQUE; IF EXISTS guards re-runs.
ALTER TABLE event_signups DROP CONSTRAINT IF EXISTS event_signups_event_id_profile_id_key;
ALTER TABLE event_signups DROP CONSTRAINT IF EXISTS event_signups_event_id_profile_id_unique;
ALTER TABLE event_signups
  ADD CONSTRAINT event_signups_event_profile_occurrence_unique
  UNIQUE (event_id, profile_id, occurrence_date);

CREATE INDEX IF NOT EXISTS idx_event_signups_event_occurrence
  ON event_signups(event_id, occurrence_date);

-- 3) Host auto-enrol trigger now records the first occurrence date too.
CREATE OR REPLACE FUNCTION auto_enrol_host()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO event_signups (event_id, profile_id, status, payment_status, occurrence_date)
  VALUES (NEW.id, NEW.admin_id, 'accepted', 'free', (NEW.starts_at AT TIME ZONE 'UTC')::date)
  ON CONFLICT (event_id, profile_id, occurrence_date) DO NOTHING;

  INSERT INTO event_admins (event_id, profile_id)
  VALUES (NEW.id, NEW.admin_id)
  ON CONFLICT (event_id, profile_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
