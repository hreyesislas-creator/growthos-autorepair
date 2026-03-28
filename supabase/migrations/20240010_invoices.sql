-- ============================================================
-- Migration 20240010: invoices and invoice_items
--
-- Creates tables to support invoice generation from work orders.
-- Maintains soft links to work orders (no CASCADE DELETE) to
-- preserve invoice history when work orders are deleted.
--
-- Design rules:
--   • invoices has a soft FK to work_orders (no CASCADE DELETE)
--     to preserve invoice history.
--   • invoice_items use soft link to work_order_item_id
--     (no FK constraint) for the same reason.
--   • Status values: draft, sent, paid, void
--   • invoice_number is generated application-side (e.g., "INV-2024-0001")
--     unique per tenant.
--   • Subtotal buckets: subtotal_labor, subtotal_parts, subtotal_other, subtotal
--
-- Naming follows the established repo sequence:
--   20240001 estimate_system
--   20240002 tenant_pricing_config
--   20240003 service_jobs_catalog
--   20240004 estimate_item_parts
--   20240005 estimate_item_decisions
--   20240006 work_orders
--   20240007 work_order_time_tracking
--   20240008 soft_archive
--   20240009 service_recommendations
--   20240010 invoices  ← this file
-- ============================================================

-- ---------------------------------------------------------------------------
-- A) invoices  — one header record per invoice
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS invoices (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid        NOT NULL,

  -- Link back to the source work order (soft — no CASCADE to preserve history)
  work_order_id        uuid        NOT NULL,

  -- Customer and vehicle context (copied from work order at creation)
  customer_id          uuid,
  vehicle_id           uuid,

  -- Human-readable identifier, e.g. "INV-2024-0001"
  -- Generated application-side; unique per tenant.
  invoice_number       text,

  -- Current status of the invoice
  status               text        NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'sent', 'paid', 'void')),

  -- Subtotal buckets — enable clean breakdowns
  subtotal_labor       numeric(10,2) NOT NULL DEFAULT 0,
  subtotal_parts       numeric(10,2) NOT NULL DEFAULT 0,
  subtotal_other       numeric(10,2) NOT NULL DEFAULT 0,
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

  -- Audit columns
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────

-- Primary tenant isolation and status filtering
CREATE INDEX IF NOT EXISTS idx_invoices_tenant
  ON invoices (tenant_id);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status
  ON invoices (tenant_id, status);

-- Lookup invoices by source work order
CREATE INDEX IF NOT EXISTS idx_invoices_work_order
  ON invoices (work_order_id);

-- Lookup invoices by customer
CREATE INDEX IF NOT EXISTS idx_invoices_customer
  ON invoices (tenant_id, customer_id);

-- Unique invoice number per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_number
  ON invoices (tenant_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

-- ---------------------------------------------------------------------------
-- B) invoice_items  — line items belonging to an invoice
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS invoice_items (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid        NOT NULL,

  -- Cascade: deleting the invoice deletes its items
  invoice_id              uuid        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  -- Soft link to the source work order item (no FK constraint)
  -- Nullable: some invoice items may not have a source WO item
  work_order_item_id      uuid,

  -- Item descriptive content
  title                   text        NOT NULL,
  description             text,

  -- Category: labor, part, fee, misc
  category                text        NOT NULL DEFAULT 'misc'
                          CHECK (category IN ('labor', 'part', 'fee', 'misc')),

  -- Labor pricing
  labor_hours             numeric(10,3),
  labor_rate              numeric(10,2),
  labor_total             numeric(10,2) NOT NULL DEFAULT 0,

  -- Parts pricing
  parts_total             numeric(10,2) NOT NULL DEFAULT 0,

  -- Total for this line item
  line_total              numeric(10,2) NOT NULL DEFAULT 0,

  -- Controls sort order in the UI
  display_order           integer     NOT NULL DEFAULT 0,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────

-- Primary read pattern: load all items for one invoice
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice
  ON invoice_items (invoice_id);

-- Lookup items by source work order item (for UI traceability, auditing)
CREATE INDEX IF NOT EXISTS idx_invoice_items_work_order_item
  ON invoice_items (work_order_item_id)
  WHERE work_order_item_id IS NOT NULL;

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Identical tenant-isolation pattern used throughout the system.

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_invoices"
  ON invoices
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

CREATE POLICY "tenant_isolation_invoice_items"
  ON invoice_items
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

-- ---------------------------------------------------------------------------
-- C) work_orders table migration: add invoice_id soft FK
-- ---------------------------------------------------------------------------

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS invoice_id uuid;

-- Index for looking up work orders by invoice
CREATE INDEX IF NOT EXISTS idx_work_orders_invoice
  ON work_orders (invoice_id)
  WHERE invoice_id IS NOT NULL;
