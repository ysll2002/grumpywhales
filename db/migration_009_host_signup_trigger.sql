-- ─────────────────────────────────────────────────────────────────────────
-- migration_009_host_signup_trigger — guarantee the host is on the roster
-- of every event they create, regardless of how the row was inserted.
-- Idempotent: uses ON CONFLICT DO NOTHING so it's safe if the API has
-- already inserted the row, and safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auto_enrol_host()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO event_signups (event_id, profile_id, status, payment_status)
  VALUES (NEW.id, NEW.admin_id, 'accepted', 'free')
  ON CONFLICT (event_id, profile_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_enrol_host ON events;
CREATE TRIGGER trg_auto_enrol_host
  AFTER INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION auto_enrol_host();
