-- Replace shop_announcements INSERT/DELETE policies so raw tenant_users.role matches
-- app behavior: canManageShopAnnouncements after normalization (owner/manager -> admin,
-- advisor -> service_advisor) corresponds to these DB values — no stricter RLS than app.

DROP POLICY IF EXISTS shop_announcements_insert_staff ON shop_announcements;
DROP POLICY IF EXISTS shop_announcements_delete_staff ON shop_announcements;

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
