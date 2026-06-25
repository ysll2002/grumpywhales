-- ─────────────────────────────────────────────────────────────────────────
-- migration_017 — drop invoicing tables
-- Run this once in the Supabase SQL Editor after migration 016.
-- ─────────────────────────────────────────────────────────────────────────
-- clients, invoices and invoice_emails were the invoicing-era surface.
-- The pivot to paid event hosting + Stripe checkout means nothing reads
-- or writes these anymore.

DROP TABLE IF EXISTS invoice_emails CASCADE;
DROP TABLE IF EXISTS invoices       CASCADE;
DROP TABLE IF EXISTS clients        CASCADE;

-- profiles still has a few invoicing-era columns (default_currency etc.)
-- They're harmless and may yet be useful for events; leaving in place.
