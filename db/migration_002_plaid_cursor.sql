-- Plaid /transactions/sync returns a cursor that tells the next call where to
-- resume. Store it per bank_connection so subsequent syncs are incremental.
ALTER TABLE bank_connections
  ADD COLUMN IF NOT EXISTS plaid_cursor TEXT;

-- Speed up "find sent invoice by user + reference" — the hot path on each
-- incoming transaction.
CREATE INDEX IF NOT EXISTS idx_invoices_reference_lookup
  ON invoices (user_id, reference)
  WHERE status = 'sent';

-- PostgREST schema cache reload so the new column is visible immediately.
NOTIFY pgrst, 'reload schema';
