-- ============================================================
-- Shop announcements (internal tenant messaging for technicians)
-- Minimal: title + body, no customer SMS linkage.
-- ============================================================

CREATE TABLE shop_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES tenant_users(id) ON DELETE SET NULL,
  CONSTRAINT shop_announcements_title_nonempty CHECK (char_length(trim(title)) > 0),
  CONSTRAINT shop_announcements_message_nonempty CHECK (char_length(trim(message)) > 0)
);

CREATE INDEX idx_shop_announcements_tenant_created
  ON shop_announcements (tenant_id, created_at DESC);

COMMENT ON TABLE shop_announcements IS 'Internal shop posts for technicians; not customer message_logs.';

-- RLS: any active member of the tenant may read; only admin/advisor-class roles may write/delete.

ALTER TABLE shop_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY shop_announcements_select_member
  ON shop_announcements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM tenant_users tu
      WHERE tu.auth_user_id = auth.uid()
        AND tu.is_active = true
        AND tu.tenant_id = shop_announcements.tenant_id
        AND tu.role <> 'viewer'
    )
  );

CREATE POLICY shop_announcements_insert_staff
  ON shop_announcements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM tenant_users tu
      WHERE tu.auth_user_id = auth.uid()
        AND tu.is_active = true
        AND tu.tenant_id = shop_announcements.tenant_id
        AND tu.role IN (
          'admin',
          'owner',
          'manager',
          'service_advisor',
          'advisor'
        )
    )
  );

CREATE POLICY shop_announcements_delete_staff
  ON shop_announcements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM tenant_users tu
      WHERE tu.auth_user_id = auth.uid()
        AND tu.is_active = true
        AND tu.tenant_id = shop_announcements.tenant_id
        AND tu.role IN (
          'admin',
          'owner',
          'manager',
          'service_advisor',
          'advisor'
        )
    )
  );
