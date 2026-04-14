-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Invoice Payment Metadata Fields
-- Adds structured payment metadata to invoice_payments:
--   card_type, last4_digits, authorization_number → card payments
--   reference_number                               → zelle, check, financing, other
-- All columns nullable — validation is enforced at the application layer.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE invoice_payments
  ADD COLUMN IF NOT EXISTS card_type             TEXT
    CHECK (card_type IN ('debit', 'visa', 'mastercard', 'amex', 'other')),
  ADD COLUMN IF NOT EXISTS last4_digits          TEXT,
  ADD COLUMN IF NOT EXISTS authorization_number  TEXT,
  ADD COLUMN IF NOT EXISTS reference_number      TEXT;
