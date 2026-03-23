-- =============================================================================
-- GrowthOS AutoRepair — Tenant Pricing Configuration
-- Paste into Supabase SQL Editor and click Run.
-- Safe to run multiple times (IF NOT EXISTS / OR REPLACE throughout).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. tenant_pricing_configs
--    One row per tenant.  All rate fields are nullable so a shop that hasn't
--    configured pricing yet doesn't break anything.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenant_pricing_configs (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- One config per tenant — enforced by the UNIQUE constraint below.
  tenant_id            uuid          NOT NULL,

  -- Default tax rate applied to new estimates.
  -- Stored as a decimal fraction: 0.0875 = 8.75%.
  -- NULL means "no default" — estimates start with no tax rate pre-filled.
  default_tax_rate     numeric(8,6),

  -- Default shop labor rate in USD per hour.
  -- Reserved for future use — not yet wired into the estimate builder.
  default_labor_rate   numeric(10,2),

  -- Parts markup expressed as a percentage (e.g. 30.00 = 30%).
  -- Reserved for future use.
  parts_markup_percent numeric(8,4),

  created_at           timestamptz   NOT NULL DEFAULT now(),
  updated_at           timestamptz   NOT NULL DEFAULT now()
);

-- One config row per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_pricing_configs_tenant
  ON tenant_pricing_configs (tenant_id);


-- ---------------------------------------------------------------------------
-- 2. Row-Level Security
--    Same resolver pattern as the rest of the project:
--    auth.uid() → tenant_users.auth_user_id → tenant_id
-- ---------------------------------------------------------------------------

ALTER TABLE tenant_pricing_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_config_tenant_all" ON tenant_pricing_configs;
CREATE POLICY "pricing_config_tenant_all" ON tenant_pricing_configs
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
