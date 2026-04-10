-- ============================================================
-- GrowthOS AutoRepair — Fix call_logs RLS Policies
-- Corrects broken tenant isolation from migration 20240014
-- ============================================================

-- Drop broken policies from 20240014
DROP POLICY IF EXISTS "Tenants can view their own call logs" ON call_logs;
DROP POLICY IF EXISTS "Tenants can insert their own call logs" ON call_logs;
DROP POLICY IF EXISTS "Tenants can update their own call logs" ON call_logs;

-- Create correct tenant isolation policy using the same pattern as work_orders
-- This policy matches the project-wide tenant isolation pattern:
-- - Uses auth.uid() to identify current user
-- - Joins tenant_users to find user's assigned tenant
-- - Checks is_active = true for authorized users
-- - Applies to all operations (SELECT, INSERT, UPDATE, DELETE)

CREATE POLICY "tenant_isolation_call_logs"
  ON call_logs
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
