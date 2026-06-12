-- GDPR audit trail: record when a user accepted the Terms + Privacy Policy.
-- Null = legacy account created before this column existed.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMPTZ;

-- Backfill: assume existing users accepted at their creation time.
-- Safe — we have no other interpretation of pre-existing accounts.
UPDATE profiles
SET    accepted_terms_at = created_at
WHERE  accepted_terms_at IS NULL;

NOTIFY pgrst, 'reload schema';
