-- ============================================================
-- GrowthOS AutoRepair — Telnyx inbound SMS (storage + tenant mapping)
-- Webhook persistence keyed by Telnyx event id; tenant from inbound number.
-- ============================================================

-- A) Tenant-owned Telnyx numbers (E.164 must match Telnyx payload exactly)
CREATE TABLE tenant_phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number text NOT NULL UNIQUE,
  phone_purpose text NULL,
  provider text NOT NULL DEFAULT 'telnyx',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tenant_phone_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_phone_numbers_tenant_all" ON tenant_phone_numbers;
CREATE POLICY "tenant_phone_numbers_tenant_all" ON tenant_phone_numbers
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

-- B) Inbound webhook rows (service role inserts; tenants may read their rows)
CREATE TABLE telnyx_inbound_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NULL REFERENCES tenants(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'telnyx',
  event_id text NOT NULL UNIQUE,
  message_id text NULL,
  event_type text NULL,
  from_phone text NULL,
  to_phone text NULL,
  message_text text NULL,
  raw_payload jsonb NOT NULL,
  occurred_at timestamptz NULL,
  received_at timestamptz NULL,
  processed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_telnyx_inbound_events_tenant_id ON telnyx_inbound_events (tenant_id);
CREATE INDEX idx_telnyx_inbound_events_message_id ON telnyx_inbound_events (message_id);
CREATE INDEX idx_telnyx_inbound_events_to_phone ON telnyx_inbound_events (to_phone);
CREATE INDEX idx_telnyx_inbound_events_created_at ON telnyx_inbound_events (created_at DESC);

ALTER TABLE telnyx_inbound_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "telnyx_inbound_events_tenant_select" ON telnyx_inbound_events;
CREATE POLICY "telnyx_inbound_events_tenant_select" ON telnyx_inbound_events
  FOR SELECT
  USING (
    tenant_id IS NOT NULL
    AND tenant_id = (
      SELECT tenant_id FROM tenant_users
      WHERE auth_user_id = auth.uid()
        AND is_active = true
      LIMIT 1
    )
  );
