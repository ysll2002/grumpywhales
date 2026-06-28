-- Per-signup team colour the host assigns when making up the team.
-- Stored as a free-form text key (belmont_silver, black, green, white,
-- red, pink). NULL = unassigned (rendered as 'N/A' in the UI).

ALTER TABLE event_signups
  ADD COLUMN IF NOT EXISTS team_colour text;

NOTIFY pgrst, 'reload schema';
