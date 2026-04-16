-- Invitation onboarding (separate from is_active = membership enabled/disabled).
-- pending: row created at invite; user has not finished set-password yet.
-- accepted: user completed onboarding (set password).
-- NULL: legacy rows created before this column — treat as accepted in app.

ALTER TABLE tenant_users
  ADD COLUMN IF NOT EXISTS invite_status text;

ALTER TABLE tenant_users
  DROP CONSTRAINT IF EXISTS tenant_users_invite_status_check;

ALTER TABLE tenant_users
  ADD CONSTRAINT tenant_users_invite_status_check
 CHECK (invite_status IS NULL OR invite_status IN ('pending', 'accepted'));

COMMENT ON COLUMN tenant_users.invite_status IS
  'Onboarding: pending until invitee completes set-password; accepted after. NULL = pre-migration / legacy (fully onboarded).';
