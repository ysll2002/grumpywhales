-- Weekly events can now define a sign-up open window: for each occurrence
-- date, sign-ups open at the most recent (signup_open_dow, signup_open_time)
-- strictly before that date. Times are stored UTC; the public page renders
-- them in the viewer's local timezone.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS signup_open_dow  smallint,   -- 0 = Sun .. 6 = Sat
  ADD COLUMN IF NOT EXISTS signup_open_time time;

ALTER TABLE events
  ADD CONSTRAINT events_signup_open_dow_range
  CHECK (signup_open_dow IS NULL OR signup_open_dow BETWEEN 0 AND 6);

NOTIFY pgrst, 'reload schema';
