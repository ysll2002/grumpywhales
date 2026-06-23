-- ─────────────────────────────────────────────────────────────────────────
-- migration_008_remove_draft — promote draft events to published and
-- back-fill host auto-signups for events created before that became automatic.
-- Run this once in the Supabase SQL Editor on top of migration 007.
-- ─────────────────────────────────────────────────────────────────────────

-- Any leftover drafts become live. New events default to 'published'.
UPDATE events SET status = 'published' WHERE status = 'draft';

-- Back-fill: every host should be on the roster of every event they admin.
-- ON CONFLICT keeps the existing row if the host had already signed up by hand.
INSERT INTO event_signups (event_id, profile_id, status, payment_status)
SELECT id, admin_id, 'accepted', 'free'
FROM events
ON CONFLICT (event_id, profile_id) DO NOTHING;
