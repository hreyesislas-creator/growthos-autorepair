-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Invoice Payment Tracking
-- Purpose:
--   1. Extend invoices with payment_status, amount_paid, balance_due
--   2. Create invoice_payments table for per-payment records
--   3. Backfill existing data safely (nullable → backfill → NOT NULL)
-- Future-ready: enables revenue-by-method, outstanding-balance, date-range queries
-- Production-safe: works on tables with pre-existing rows
-- ─────────────────────────────────────────────────────────────────────────────

-- ── STEP 1: Add new columns as NULLABLE (no NOT NULL yet) ─────────────────────
-- Safe on any size table with existing rows. Each column added separately
-- to avoid multi-column ALTER sequencing issues.

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid    NUMERIC(10,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance_due    NUMERIC(10,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_status TEXT;

-- ── STEP 2: Backfill all existing rows ────────────────────────────────────────
-- Must run before NOT NULL is enforced. Ensures no row is left with NULL.

-- All existing invoices start with zero payments recorded
UPDATE invoices
SET amount_paid = 0
WHERE amount_paid IS NULL;

-- Outstanding balance starts at the full invoice total
UPDATE invoices
SET balance_due = total
WHERE balance_due IS NULL;

-- Default payment status for rows not yet set
UPDATE invoices
SET payment_status = 'unpaid'
WHERE payment_status IS NULL;

-- ── STEP 3: Sync invoices already marked paid via legacy status field ──────────
-- If the shop previously marked an invoice as 'paid' (document status),
-- reflect that in the new payment tracking fields.

UPDATE invoices
SET payment_status = 'paid',
    amount_paid    = total,
    balance_due    = 0
WHERE status = 'paid'
  AND payment_status = 'unpaid';

-- ── STEP 4: Now enforce NOT NULL and set column defaults ──────────────────────
-- All rows are backfilled above, so this is safe.

ALTER TABLE invoices ALTER COLUMN amount_paid    SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN amount_paid    SET DEFAULT 0;

ALTER TABLE invoices ALTER COLUMN balance_due    SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN balance_due    SET DEFAULT 0;

ALTER TABLE invoices ALTER COLUMN payment_status SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN payment_status SET DEFAULT 'unpaid';

-- ── STEP 5: Add CHECK constraint for payment_status ───────────────────────────
-- Use IF NOT EXISTS guard to make re-runs safe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_payment_status_check'
      AND conrelid = 'invoices'::regclass
  ) THEN
    ALTER TABLE invoices
      ADD CONSTRAINT invoices_payment_status_check
      CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid'));
  END IF;
END
$$;

-- ── STEP 6: Create invoice_payments table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_payments (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID          NOT NULL,
  invoice_id      UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id     UUID,                        -- denormalized for reporting queries
  amount          NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_method  TEXT          NOT NULL
    CHECK (payment_method IN ('card', 'cash', 'zelle', 'check', 'financing', 'other')),
  paid_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  note            TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── STEP 7: Enable RLS ────────────────────────────────────────────────────────
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- Server actions use the service-role admin client (bypasses RLS).
-- This policy is a safety net for any direct client access.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'invoice_payments_tenant_isolation'
      AND tablename  = 'invoice_payments'
  ) THEN
    CREATE POLICY "invoice_payments_tenant_isolation"
      ON invoice_payments
      FOR ALL
      USING (tenant_id = (
        SELECT tenant_id FROM tenants
        WHERE id = auth.uid()
        LIMIT 1
      ));
  END IF;
END
$$;

-- ── STEP 8: Indexes for reporting queries ─────────────────────────────────────
-- Revenue by invoice
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id
  ON invoice_payments(invoice_id);

-- Revenue by date (daily/weekly/monthly totals)
CREATE INDEX IF NOT EXISTS idx_invoice_payments_tenant_paid_at
  ON invoice_payments(tenant_id, paid_at DESC);

-- Revenue by payment method
CREATE INDEX IF NOT EXISTS idx_invoice_payments_method
  ON invoice_payments(tenant_id, payment_method);
