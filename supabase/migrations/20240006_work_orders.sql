-- ============================================================
-- Migration 20240006: work_orders and work_order_items
--
-- Creates tables to support work order generation from approved
-- estimate items. Maintains soft links to estimates and items
-- for audit trail and historical tracking.
--
-- Design rules:
--   • work_orders has a soft FK to estimates (no CASCADE DELETE)
--     to preserve WO history when estimates are deleted.
--   • work_order_items use soft link to estimate_item_id
--     (no FK constraint) for the same reason.
--   • Status values: draft, ready, in_progress, completed, invoiced
--   • estimate_number is copied from estimate at WO creation time.
--     This preserves the original estimate reference for reporting.
--
-- Naming follows the established repo sequence:
--   20240001 estimate_system
--   20240002 tenant_pricing_config
--   20240003 service_jobs_catalog
--   20240004 estimate_item_parts
--   20240005 estimate_item_decisions
--   20240006 work_orders  ← this file
-- ============================================================

-- ---------------------------------------------------------------------------
-- A) work_orders  — one header record per work order
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS work_orders (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid        NOT NULL,

  -- Link back to the source estimate (soft — no CASCADE to preserve history)
  estimate_id          uuid        NOT NULL REFERENCES estimates(id),

  -- Optional FK back to the inspection that sourced the estimate
  inspection_id        uuid,

  -- Customer and vehicle context (copied from estimate at creation)
  customer_id          uuid,
  vehicle_id           uuid,

  -- Human-readable identifier, e.g. "WO-2024-0042"
  -- Generated application-side; unique per tenant.
  work_order_number    text,

  -- How the work order was created.
  creation_mode        text        NOT NULL DEFAULT 'from_estimate'
                       CHECK (creation_mode IN ('from_estimate', 'manual_entry')),

  -- Current status of the work order
  status               text        NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'ready', 'in_progress', 'completed', 'invoiced')),

  -- Subtotal buckets — optional but enable clean breakdowns
  subtotal             numeric(10,2) NOT NULL DEFAULT 0,

  -- Tax:
  --   tax_rate   — snapshot of the rate applied (e.g. 0.0875 for 8.75%)
  --   tax_amount — the dollar amount of tax
  tax_rate             numeric(8,6),
  tax_amount           numeric(10,2) NOT NULL DEFAULT 0,

  -- Total = subtotal + tax_amount
  total                numeric(10,2) NOT NULL DEFAULT 0,

  -- Notes
  notes                text,                     -- customer-facing notes
  internal_notes       text,                     -- shop-internal only

  -- Markup applied to all parts in this work order
  parts_markup_percent numeric(8,4) DEFAULT 0,

  -- Soft copy of the source estimate number for traceability
  estimate_number      text,

  -- Audit columns
  created_by           uuid,                     -- auth.users.id of the creating user
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────

-- Primary tenant isolation and status filtering
CREATE INDEX IF NOT EXISTS idx_work_orders_tenant
  ON work_orders (tenant_id);

CREATE INDEX IF NOT EXISTS idx_work_orders_tenant_status
  ON work_orders (tenant_id, status);

-- Lookup work orders by source estimate
CREATE INDEX IF NOT EXISTS idx_work_orders_estimate
  ON work_orders (estimate_id);

-- Lookup work orders by customer
CREATE INDEX IF NOT EXISTS idx_work_orders_customer
  ON work_orders (tenant_id, customer_id);

-- Unique work order number per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_orders_number
  ON work_orders (tenant_id, work_order_number)
  WHERE work_order_number IS NOT NULL;

-- ---------------------------------------------------------------------------
-- B) work_order_items  — line items belonging to a work order
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS work_order_items (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid        NOT NULL,

  -- Cascade: deleting the work order deletes its items
  work_order_id           uuid        NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,

  -- Soft link to the source estimate item (no FK constraint)
  -- Nullable: some WO items may not have a source estimate item
  estimate_item_id        uuid,

  -- Optional FK to service_jobs catalog
  service_job_id          uuid,

  -- Item descriptive content
  title                   text        NOT NULL,
  description             text,

  -- Category: labor, part, fee, tax, misc
  category                text        NOT NULL DEFAULT 'misc'
                          CHECK (category IN ('labor', 'part', 'fee', 'tax', 'misc')),

  -- Labor pricing
  labor_hours             numeric(10,3),
  labor_rate              numeric(10,2),
  labor_total             numeric(10,2) NOT NULL DEFAULT 0,

  -- Parts pricing
  parts_total             numeric(10,2) NOT NULL DEFAULT 0,

  -- Total for this line item
  line_total              numeric(10,2) NOT NULL DEFAULT 0,

  -- Optional FK back to inspection items for traceability
  inspection_item_id      uuid,

  -- Optional FK back to service recommendations for traceability
  service_recommendation_id uuid,

  -- Future: track status of individual work order items
  status                  text,

  -- Future: assign work to specific technicians
  assigned_to             uuid,

  -- Controls sort order in the UI
  display_order           integer     NOT NULL DEFAULT 0,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────

-- Primary read pattern: load all items for one work order
CREATE INDEX IF NOT EXISTS idx_work_order_items_work_order
  ON work_order_items (work_order_id);

-- Lookup items by source estimate item (for UI traceability, auditing)
CREATE INDEX IF NOT EXISTS idx_work_order_items_estimate_item
  ON work_order_items (estimate_item_id)
  WHERE estimate_item_id IS NOT NULL;

-- Lookup items by service job (future: job-level reporting)
CREATE INDEX IF NOT EXISTS idx_work_order_items_service_job
  ON work_order_items (service_job_id)
  WHERE service_job_id IS NOT NULL;

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Identical tenant-isolation pattern used throughout the estimate system.

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_work_orders"
  ON work_orders
  FOR ALL
  USING (
    tenant_id = (
      SELECT tenant_id FROM tenant_users
      WHERE auth_user_id = auth.uid()
        AND is_active = true
      LIMIT 1
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM tenant_users
      WHERE auth_user_id = auth.uid()
        AND is_active = true
      LIMIT 1
    )
  );

CREATE POLICY "tenant_isolation_work_order_items"
  ON work_order_items
  FOR ALL
  USING (
    tenant_id = (
      SELECT tenant_id FROM tenant_users
      WHERE auth_user_id = auth.uid()
        AND is_active = true
      LIMIT 1
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM tenant_users
      WHERE auth_user_id = auth.uid()
        AND is_active = true
      LIMIT 1
    )
  );
