-- Platform admins: emails allowed to create events and manage the admin list.
-- One row per admin email; case-insensitive lookups via the unique lower(email) index.

CREATE TABLE IF NOT EXISTS platform_admins (
  email      text PRIMARY KEY,
  added_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_admins_email_lower_uniq
  ON platform_admins ((lower(email)));

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
-- No policies: all access via service_role only.

-- Seed the founding admin so the table is never empty.
INSERT INTO platform_admins (email)
VALUES ('lilin.gabriel@gmail.com')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
