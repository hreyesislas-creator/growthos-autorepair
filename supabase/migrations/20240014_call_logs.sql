-- ============================================================
-- GrowthOS AutoRepair — Call Logs (Missed-Call Capture)
-- Phase 1: Basic inbound call logging and missed-call SMS
-- ============================================================

CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Twilio identifiers
  twilio_call_sid VARCHAR UNIQUE NOT NULL,
  twilio_account_sid VARCHAR,

  -- Phone numbers (stored in E.164 format: +14155552671)
  from_number VARCHAR NOT NULL,        -- caller's number
  to_number VARCHAR NOT NULL,          -- shop's number

  -- Call state tracking
  call_status VARCHAR,                 -- queued | ringing | in-progress | completed
  disposition VARCHAR,                 -- null (pending) | answered | missed | failed
  call_duration_seconds INT,           -- filled when call ends

  -- Timestamps
  initiated_at TIMESTAMPTZ NOT NULL,   -- when inbound call arrived
  connected_at TIMESTAMPTZ,            -- when call was answered (if answered)
  ended_at TIMESTAMPTZ,                -- when call ended

  -- SMS tracking (missed-call follow-up)
  missed_call_sms_sent BOOLEAN DEFAULT FALSE,
  missed_call_sms_sent_at TIMESTAMPTZ,

  -- System
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_call_logs_tenant_created
  ON call_logs(tenant_id, created_at DESC);
CREATE INDEX idx_call_logs_twilio_sid
  ON call_logs(twilio_call_sid);
CREATE INDEX idx_call_logs_from_number
  ON call_logs(from_number);

-- RLS Policies
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their own call logs"
  ON call_logs FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM tenants WHERE id = tenant_id));

CREATE POLICY "Tenants can insert their own call logs"
  ON call_logs FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM tenants WHERE id = tenant_id));

CREATE POLICY "Tenants can update their own call logs"
  ON call_logs FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM tenants WHERE id = tenant_id))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM tenants WHERE id = tenant_id));
