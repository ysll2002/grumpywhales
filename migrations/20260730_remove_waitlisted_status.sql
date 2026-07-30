-- The 'waitlisted' status (originally intended for first_come past-capacity
-- sign-ups) was never actually used and has been removed from the app.
-- Convert any stray rows to 'waiting_list' so the frontend union stays
-- exhaustive — a curated re-decision is the closest safe fallback.

UPDATE event_signups
   SET status = 'waiting_list'
 WHERE status = 'waitlisted';
