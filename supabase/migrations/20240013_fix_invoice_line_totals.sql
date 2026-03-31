-- ============================================================
-- Migration 20240013: Fix invoice line_total and total calculations
--
-- CRITICAL FIX: Invoice items and totals were calculated incorrectly.
--
-- BUG: line_total was only storing labor_total, not labor_total + parts_total
--   Example:
--     labor_total = 290
--     parts_total = 38.99
--     line_total = 290  ← WRONG (should be 328.99)
--
-- FIX: This migration recalculates all invoice line_totals and header totals
--
-- New calculation rules:
--   1. invoice_items.line_total = labor_total + parts_total
--   2. invoices.subtotal_labor = SUM(invoice_items.labor_total)
--   3. invoices.subtotal_parts = SUM(invoice_items.parts_total)
--   4. invoices.subtotal = subtotal_labor + subtotal_parts
--   5. invoices.tax_amount = subtotal_parts * tax_rate (tax on parts only)
--   6. invoices.total = subtotal + tax_amount
--
-- ============================================================

-- Step 1: Fix invoice_items.line_total for all invoices
-- Set line_total = labor_total + parts_total
UPDATE invoice_items
SET
  line_total = ROUND((COALESCE(labor_total, 0) + COALESCE(parts_total, 0))::numeric, 2),
  updated_at = now()
WHERE
  -- Only update if line_total is wrong (doesn't match labor + parts)
  ABS(line_total - ROUND((COALESCE(labor_total, 0) + COALESCE(parts_total, 0))::numeric, 2)) > 0.01;

-- Step 2: Recalculate invoice header totals for all invoices
-- This uses a CTE to calculate per-invoice totals from invoice_items
WITH invoice_totals AS (
  SELECT
    ii.invoice_id,
    ROUND(SUM(COALESCE(ii.labor_total, 0))::numeric, 2) AS calc_subtotal_labor,
    ROUND(SUM(COALESCE(ii.parts_total, 0))::numeric, 2) AS calc_subtotal_parts,
    i.tax_rate
  FROM invoice_items ii
  JOIN invoices i ON i.id = ii.invoice_id
  GROUP BY ii.invoice_id, i.tax_rate
)
UPDATE invoices i
SET
  subtotal_labor = it.calc_subtotal_labor,
  subtotal_parts = it.calc_subtotal_parts,
  subtotal = it.calc_subtotal_labor + it.calc_subtotal_parts,
  tax_amount = ROUND((it.calc_subtotal_parts * COALESCE(it.tax_rate, 0))::numeric, 2),
  total = ROUND((it.calc_subtotal_labor + it.calc_subtotal_parts + (it.calc_subtotal_parts * COALESCE(it.tax_rate, 0)))::numeric, 2),
  updated_at = now()
FROM invoice_totals it
WHERE i.id = it.invoice_id;

-- Log: Show count of fixed invoices
SELECT
  COUNT(*) as total_invoices_checked,
  COUNT(CASE WHEN updated_at = now() THEN 1 END) as invoices_updated
FROM invoices
WHERE updated_at >= now() - interval '1 second';
