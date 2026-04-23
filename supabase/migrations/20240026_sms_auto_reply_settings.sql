-- ============================================================
-- GrowthOS AutoRepair — Per-tenant fixed SMS auto-reply (Telnyx)
-- ============================================================

CREATE TABLE sms_auto_reply_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  reply_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_auto_reply_settings_tenant_id ON sms_auto_reply_settings (tenant_id);

ALTER TABLE sms_auto_reply_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sms_auto_reply_settings_tenant_all" ON sms_auto_reply_settings;
CREATE POLICY "sms_auto_reply_settings_tenant_all" ON sms_auto_reply_settings
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
