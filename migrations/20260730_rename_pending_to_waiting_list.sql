-- Rename the curated-mode "waiting for admin decision" status from
-- 'pending' to 'waiting_list' — the UI label is "Waiting list".
-- Also flips the column default so new curated sign-ups land on the
-- renamed value.

UPDATE event_signups
   SET status = 'waiting_list'
 WHERE status = 'pending';

ALTER TABLE event_signups
  ALTER COLUMN status SET DEFAULT 'waiting_list';
