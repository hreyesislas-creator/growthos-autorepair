-- ============================================================
-- GrowthOS AutoRepair — Tenant Service Catalog (canned jobs)
-- Predefined services per tenant for quick estimate building.
-- ============================================================

CREATE TABLE IF NOT EXISTS service_catalog (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                  text          NOT NULL,
  description           text,
  default_labor_hours   numeric(10,3),
  default_labor_rate    numeric(10,2),
  default_parts         jsonb         DEFAULT '[]'::jsonb,
  default_notes         text,
  is_active             boolean       NOT NULL DEFAULT true,
  created_at            timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_catalog_tenant_id
  ON service_catalog (tenant_id);

ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_catalog_tenant_all" ON service_catalog;
CREATE POLICY "service_catalog_tenant_all" ON service_catalog
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
