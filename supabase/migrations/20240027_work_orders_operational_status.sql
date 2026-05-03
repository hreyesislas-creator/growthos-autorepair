-- ============================================================
-- Migration 20240027: work_orders.operational_status
--
-- Optional operational sub-status for job board / shop floor UX.
-- Independent from lifecycle work_orders.status (draft → invoiced).
-- No backfill; existing rows remain NULL.
-- ============================================================

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS operational_status text;

ALTER TABLE work_orders
  DROP CONSTRAINT IF EXISTS work_orders_operational_status_check;

ALTER TABLE work_orders
  ADD CONSTRAINT work_orders_operational_status_check
  CHECK (
    operational_status IS NULL
    OR operational_status IN (
      'waiting_on_parts',
      'waiting_on_customer',
      'waiting_on_insurance',
      'waiting_on_sublet',
      'on_hold',
      'need_to_order_parts'
    )
  );

COMMENT ON COLUMN work_orders.operational_status IS
  'Shop operational sub-status for board display only; does not replace lifecycle status.';
