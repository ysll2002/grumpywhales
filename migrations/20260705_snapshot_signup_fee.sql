-- Snapshot per-signup fee_amount / fee_currency so editing an event's price
-- doesn't retroactively change what past signups appear to have paid/owe.
--
-- Rule: any signup that is already `paid` OR whose occurrence_date is in the
-- past freezes its fee at the current event price. Future-occurrence unpaid
-- signups keep fee_amount NULL and continue to track the event's live price.

ALTER TABLE event_signups
  ADD COLUMN IF NOT EXISTS fee_amount   numeric,
  ADD COLUMN IF NOT EXISTS fee_currency text;

UPDATE event_signups es
SET fee_amount   = e.fee_amount,
    fee_currency = e.fee_currency
FROM events e
WHERE es.event_id = e.id
  AND es.fee_amount IS NULL
  AND (es.payment_status = 'paid' OR es.occurrence_date < CURRENT_DATE);
