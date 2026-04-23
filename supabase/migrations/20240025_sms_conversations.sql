-- ============================================================
-- GrowthOS AutoRepair — SMS conversations + normalized messages
-- Tenant-scoped threads keyed by customer phone; Telnyx inbound rows.
-- ============================================================

CREATE TABLE sms_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_phone text NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, customer_phone)
);

CREATE INDEX idx_sms_conversations_tenant_id ON sms_conversations (tenant_id);
CREATE INDEX idx_sms_conversations_last_message_at ON sms_conversations (last_message_at DESC);

CREATE TABLE sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES sms_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL,
  message_text text NULL,
  provider text NOT NULL DEFAULT 'telnyx',
  provider_message_id text NULL,
  provider_event_id text NULL,
  from_phone text NULL,
  to_phone text NULL,
  raw_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX idx_sms_messages_tenant_id ON sms_messages (tenant_id);
CREATE INDEX idx_sms_messages_conversation_id ON sms_messages (conversation_id);
CREATE INDEX idx_sms_messages_created_at ON sms_messages (created_at DESC);

ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sms_conversations_tenant_all" ON sms_conversations;
CREATE POLICY "sms_conversations_tenant_all" ON sms_conversations
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

DROP POLICY IF EXISTS "sms_messages_tenant_all" ON sms_messages;
CREATE POLICY "sms_messages_tenant_all" ON sms_messages
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
