-- ============================================================
-- Migration: estimate_item_parts
-- Adds missing columns to estimate_items and creates the
-- estimate_item_parts table for nested parts under each item.
-- ============================================================

-- ── 1a. Add missing columns to estimates ─────────────────────
--
-- parts_markup_percent: the estimate-level markup applied to all part costs.
-- Stored as a percentage (e.g. 30.00 = 30%).  Null = no markup.
-- Tax is applied to parts ONLY, never to labor.

ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS parts_markup_percent numeric(8,4) DEFAULT 0;

-- ── 1b. Add missing columns to estimate_items ────────────────

ALTER TABLE estimate_items
  ADD COLUMN IF NOT EXISTS service_job_id  uuid,
  ADD COLUMN IF NOT EXISTS labor_hours     numeric(10,3),
  ADD COLUMN IF NOT EXISTS labor_rate      numeric(10,2),
  ADD COLUMN IF NOT EXISTS labor_total     numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parts_total     numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes           text;

-- ── 2. Create estimate_item_parts table ──────────────────────

CREATE TABLE IF NOT EXISTS estimate_item_parts (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL,
  estimate_id      uuid          NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  estimate_item_id uuid          NOT NULL REFERENCES estimate_items(id) ON DELETE CASCADE,
  name             text          NOT NULL DEFAULT '',
  quantity         numeric(10,3) NOT NULL DEFAULT 1,
  unit_cost        numeric(10,2) NOT NULL DEFAULT 0,
  profit_amount    numeric(10,2) NOT NULL DEFAULT 0,
  unit_sell_price  numeric(10,2) NOT NULL DEFAULT 0,
  line_total       numeric(10,2) NOT NULL DEFAULT 0,
  display_order    integer       NOT NULL DEFAULT 0,
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now()
);

-- ── 3. Indexes ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS estimate_item_parts_estimate_id_idx
  ON estimate_item_parts (estimate_id);

CREATE INDEX IF NOT EXISTS estimate_item_parts_estimate_item_id_idx
  ON estimate_item_parts (estimate_item_id);

-- ── 4. RLS ────────────────────────────────────────────────────

ALTER TABLE estimate_item_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_estimate_item_parts" ON estimate_item_parts
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
