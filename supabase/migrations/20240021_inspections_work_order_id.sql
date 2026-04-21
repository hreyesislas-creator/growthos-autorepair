-- Link inspections to an optional parent work order (WO → inspection entry point).
-- Nullable: inspections created outside a work order are unchanged.

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS work_order_id uuid REFERENCES work_orders (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inspections_work_order
  ON inspections (tenant_id, work_order_id)
  WHERE work_order_id IS NOT NULL;

COMMENT ON COLUMN inspections.work_order_id IS 'Optional link when this inspection was started from a work order.';
