-- Split editable first / last name fields on profiles.
-- `name` stays the canonical display name kept in sync as "first last" when set.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name  text;

-- Backfill: split existing `name` on the first space.
UPDATE profiles
SET
  first_name = COALESCE(first_name, NULLIF(split_part(name, ' ', 1), '')),
  last_name  = COALESCE(
    last_name,
    NULLIF(NULLIF(regexp_replace(name, '^\S+\s*', ''), ''), name)
  )
WHERE name IS NOT NULL
  AND (first_name IS NULL OR last_name IS NULL);

NOTIFY pgrst, 'reload schema';
