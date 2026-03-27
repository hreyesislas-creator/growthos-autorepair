-- ============================================================
-- Migration: 20240008_soft_archive
-- Purpose:   Add soft-archive columns to inspections, estimates,
--            and work_orders so records can be hidden from normal
--            lists without physical deletion.
--
-- Scope:
--   • ALTER TABLE only — no new tables, no data changes
--   • Adds five archive columns to each of the three tables
--   • Adds one partial index per table for active-list queries
--
-- Design rules:
--   • is_archived defaults to false — all existing rows remain active
--   • archived_at / archived_by / archive_reason / archive_note
--     are all nullable — only populated when a record is archived
--   • archived_by stores auth.users.id (UUID) — no FK constraint
--     because auth.users lives in the Supabase-managed auth schema
--   • archive_reason is free text; the application layer enforces
--     the controlled vocabulary (not a DB enum) to allow future
--     extension without another migration
--   • Partial indexes cover the (tenant_id, created_at) query
--     shape used by all three list pages — WHERE is_archived = false
--     means archived records add no overhead to normal list queries
--
-- Reversibility:
--   To roll back: DROP each index, then ALTER TABLE ... DROP COLUMN
--   for each of the five columns. All are nullable / defaulted so
--   adding them is non-destructive and reversible.
--
-- Naming sequence:
--   20240001 estimate_system
--   20240002 tenant_pricing_config
--   20240003 service_jobs_catalog
--   20240004 estimate_item_parts
--   20240005 estimate_item_decisions
--   20240006 work_orders
--   20240007 work_order_time_tracking
--   20240008 soft_archive  ← this file
-- ============================================================


-- ── 1. inspections ───────────────────────────────────────────────────────────
-- Note: the inspections table predates the migration system and is not defined
-- in any prior .sql file. ADD COLUMN IF NOT EXISTS is used on all tables but
-- is especially important here to guard against any columns that may have been
-- added manually in the Supabase console.

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS is_archived    BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at    TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_by    UUID        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archive_note   TEXT        DEFAULT NULL;

COMMENT ON COLUMN inspections.is_archived    IS 'true = archived; hidden from normal lists. Physical row is preserved.';
COMMENT ON COLUMN inspections.archived_at    IS 'Timestamp when the record was archived. NULL if active.';
COMMENT ON COLUMN inspections.archived_by    IS 'auth.users.id of the user who archived the record. NULL if active.';
COMMENT ON COLUMN inspections.archive_reason IS 'Controlled-vocabulary reason code set by the application layer.';
COMMENT ON COLUMN inspections.archive_note   IS 'Optional free-text note entered at archive time.';

-- Partial index: accelerates all active-list queries
-- (tenant_id, created_at DESC) matches the getInspections() query shape.
CREATE INDEX IF NOT EXISTS idx_inspections_active
  ON inspections (tenant_id, created_at DESC)
  WHERE is_archived = false;


-- ── 2. estimates ─────────────────────────────────────────────────────────────

ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS is_archived    BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at    TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_by    UUID        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archive_note   TEXT        DEFAULT NULL;

COMMENT ON COLUMN estimates.is_archived    IS 'true = voided; hidden from normal lists. Physical row is preserved.';
COMMENT ON COLUMN estimates.archived_at    IS 'Timestamp when the estimate was voided. NULL if active.';
COMMENT ON COLUMN estimates.archived_by    IS 'auth.users.id of the user who voided the estimate. NULL if active.';
COMMENT ON COLUMN estimates.archive_reason IS 'Controlled-vocabulary reason code set by the application layer.';
COMMENT ON COLUMN estimates.archive_note   IS 'Optional free-text note entered at void time.';

-- Partial index: accelerates all active-list queries
-- (tenant_id, created_at DESC) matches the estimates list page query shape.
CREATE INDEX IF NOT EXISTS idx_estimates_active
  ON estimates (tenant_id, created_at DESC)
  WHERE is_archived = false;


-- ── 3. work_orders ───────────────────────────────────────────────────────────

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS is_archived    BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at    TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_by    UUID        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archive_note   TEXT        DEFAULT NULL;

COMMENT ON COLUMN work_orders.is_archived    IS 'true = cancelled/archived; hidden from normal lists. Physical row is preserved.';
COMMENT ON COLUMN work_orders.archived_at    IS 'Timestamp when the work order was cancelled or archived. NULL if active.';
COMMENT ON COLUMN work_orders.archived_by    IS 'auth.users.id of the user who archived the work order. NULL if active.';
COMMENT ON COLUMN work_orders.archive_reason IS 'Controlled-vocabulary reason code set by the application layer.';
COMMENT ON COLUMN work_orders.archive_note   IS 'Optional free-text note entered at archive time.';

-- Partial index: accelerates all active-list queries
-- (tenant_id, created_at DESC) matches the work_orders list page query shape.
CREATE INDEX IF NOT EXISTS idx_work_orders_active
  ON work_orders (tenant_id, created_at DESC)
  WHERE is_archived = false;
