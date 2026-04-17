-- ============================================================
-- GrowthOS AutoRepair — Parts Catalog (Inventory Light)
-- Reusable part definitions for pricing consistency (no stock counts).
-- ============================================================

CREATE TABLE IF NOT EXISTS parts_catalog (
  id uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  part_number          text,
  name                 text          NOT NULL,
  description          text,
  default_unit_cost    numeric(10,2),
  default_unit_price   numeric(10,2),
  is_active            boolean       NOT NULL DEFAULT true,
  created_at           timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parts_catalog_tenant_id
  ON parts_catalog (tenant_id);

ALTER TABLE parts_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parts_catalog_tenant_all" ON parts_catalog;
CREATE POLICY "parts_catalog_tenant_all" ON parts_catalog
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
