-- Per-occurrence video link (post-match footage etc). Stored as a
-- JSONB map { "YYYY-MM-DD": "https://..." } on the parent events row so
-- we don't need a separate table just to keep one URL per session.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS video_links jsonb NOT NULL DEFAULT '{}'::jsonb;
