-- ─────────────────────────────────────────────────────────────────────────
-- migration_010 — admins (M:N) + attendance records + roster sort order
-- Run this once in the Supabase SQL Editor on top of migration 009.
-- ─────────────────────────────────────────────────────────────────────────

-- 1) Co-admins per event. events.admin_id stays as the creator-of-record.
CREATE TABLE IF NOT EXISTS event_admins (
  event_id    UUID         NOT NULL REFERENCES events(id)   ON DELETE CASCADE,
  profile_id  UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by  UUID                  REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, profile_id)
);
ALTER TABLE event_admins ENABLE ROW LEVEL SECURITY;

-- Back-fill: every existing event's creator is also a co-admin.
INSERT INTO event_admins (event_id, profile_id)
SELECT id, admin_id FROM events
ON CONFLICT (event_id, profile_id) DO NOTHING;

-- Extend the existing host-signup trigger to also pin the creator into event_admins.
CREATE OR REPLACE FUNCTION auto_enrol_host()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO event_signups (event_id, profile_id, status, payment_status)
  VALUES (NEW.id, NEW.admin_id, 'accepted', 'free')
  ON CONFLICT (event_id, profile_id) DO NOTHING;

  INSERT INTO event_admins (event_id, profile_id)
  VALUES (NEW.id, NEW.admin_id)
  ON CONFLICT (event_id, profile_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Attendance records — one row per (event, occurrence, profile).
--    For one-off events, occurrence_date is the event's start date.
--    For recurring events, admin marks attendance per occurrence as it happens.
CREATE TABLE IF NOT EXISTS event_attendance (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID         NOT NULL REFERENCES events(id)   ON DELETE CASCADE,
  occurrence_date DATE         NOT NULL,
  profile_id      UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attended        BOOLEAN      NOT NULL,
  recorded_by     UUID                  REFERENCES profiles(id) ON DELETE SET NULL,
  recorded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, occurrence_date, profile_id)
);
CREATE INDEX IF NOT EXISTS idx_event_attendance_event_profile ON event_attendance(event_id, profile_id);
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;

-- 3) Roster ordering. NULL means "not manually placed yet" — fall back to signed_up_at.
ALTER TABLE event_signups
  ADD COLUMN IF NOT EXISTS sort_order INT;
