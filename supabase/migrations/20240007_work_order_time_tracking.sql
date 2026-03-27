-- ============================================================
-- Migration: 20240007_work_order_time_tracking
-- Purpose:   Add started_at and completed_at timestamp columns
--            to work_orders to support work time tracking.
-- Scope:     ALTER TABLE only — no schema changes to other tables.
-- ============================================================

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS started_at   TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;

-- Optional: index completed_at for future reporting queries
-- (e.g. "all WOs completed this month"). Not critical for MVP.
CREATE INDEX IF NOT EXISTS idx_work_orders_started_at
  ON work_orders (tenant_id, started_at)
  WHERE started_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_completed_at
  ON work_orders (tenant_id, completed_at)
  WHERE completed_at IS NOT NULL;

COMMENT ON COLUMN work_orders.started_at IS
  'Timestamp when status transitioned to in_progress. NULL until work begins.';

COMMENT ON COLUMN work_orders.completed_at IS
  'Timestamp when status transitioned to completed. NULL until work finishes.';
