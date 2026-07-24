-- Adds a free-form admin_notes field on profiles. Written and read only from
-- the Settings page by a platform admin — no user-visible surface.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;
