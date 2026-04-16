-- ============================================================
-- Migration 20240017: work order technician assignment
--
-- Aligns work_orders with inspections (inspections.technician_id):
-- nullable FK to tenant_users.id. NULL = unassigned.
-- Application layer enforces edit rights for technician role.
-- ============================================================

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS technician_id uuid REFERENCES tenant_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_technician
  ON work_orders (tenant_id, technician_id)
  WHERE technician_id IS NOT NULL;

COMMENT ON COLUMN work_orders.technician_id IS
  'tenant_users.id of assigned technician; NULL = unassigned (advisor must assign for technician edit).';
