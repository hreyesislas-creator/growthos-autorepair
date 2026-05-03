-- ============================================================
-- Migration 20240028: work_order_assignments
--
-- Additive: multiple users per work order (advisor, technician,
-- supervisor, qc). Does not alter work_orders or technician_id.
-- RLS deferred to a follow-up migration.
-- ============================================================

CREATE TABLE IF NOT EXISTS work_order_assignments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL,
  work_order_id     uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  tenant_user_id    uuid NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,
  assignment_role   text NOT NULL
                    CHECK (assignment_role IN ('advisor', 'technician', 'supervisor', 'qc')),
  is_primary        boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_order_assignments_tenant_work_order
  ON work_order_assignments (tenant_id, work_order_id);

CREATE INDEX IF NOT EXISTS idx_work_order_assignments_work_order
  ON work_order_assignments (work_order_id);

CREATE INDEX IF NOT EXISTS idx_work_order_assignments_tenant_user
  ON work_order_assignments (tenant_user_id);

-- Backfill primary technician from legacy work_orders.technician_id
INSERT INTO work_order_assignments (
  tenant_id,
  work_order_id,
  tenant_user_id,
  assignment_role,
  is_primary
)
SELECT
  tenant_id,
  id,
  technician_id,
  'technician',
  true
FROM work_orders
WHERE technician_id IS NOT NULL;
