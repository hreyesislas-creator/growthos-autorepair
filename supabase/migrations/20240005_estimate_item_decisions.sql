-- ============================================================
-- Migration 20240005: estimate_item_decisions
--
-- Persists per-job advisor approve / decline decisions so
-- they survive page refreshes.
--
-- Design rules:
--   • Absence of a row means the item is still pending.
--     Only 'approved' and 'declined' are stored.
--     Deleting the row is the canonical "undo" operation.
--
--   • decided_by is nullable. Phase 1A does NOT implement a
--     real audit trail. It is a placeholder for a future phase
--     when auth.uid() is plumbed through the server actions.
--     Do not rely on this column for security decisions.
--
-- Naming follows the established repo sequence:
--   20240001 estimate_system
--   20240002 tenant_pricing_config
--   20240003 service_jobs_catalog
--   20240004 estimate_item_parts
--   20240005 estimate_item_decisions  ← this file
-- ============================================================

CREATE TABLE IF NOT EXISTS estimate_item_decisions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL,

  -- Cascade: deleting the estimate or the item cleans up its decisions.
  estimate_id      uuid        NOT NULL REFERENCES estimates(id)      ON DELETE CASCADE,
  estimate_item_id uuid        NOT NULL REFERENCES estimate_items(id) ON DELETE CASCADE,

  decision         text        NOT NULL
                   CHECK (decision IN ('approved', 'declined')),

  -- NOT a real audit trail — see design note above.
  decided_by       uuid,

  -- Authoritative decision timestamp. Distinct from updated_at so it
  -- is not clobbered if we later add housekeeping columns.
  decided_at       timestamptz NOT NULL DEFAULT now(),

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────

-- Primary read pattern: load all decisions for one estimate at page load.
CREATE INDEX IF NOT EXISTS idx_item_decisions_estimate
  ON estimate_item_decisions (tenant_id, estimate_id);

-- Secondary lookup: validate item ownership in server actions.
CREATE INDEX IF NOT EXISTS idx_item_decisions_item
  ON estimate_item_decisions (estimate_item_id);

-- ── Unique constraint ──────────────────────────────────────────────────────
--
-- One decision per (estimate, item) pair.
--
-- Why the compound key over a single column on estimate_item_id:
--   estimate_item_id is a FK to estimate_items.id and therefore globally
--   unique on its own. A single-column constraint would technically work.
--   The compound (estimate_id, estimate_item_id) is preferred because it
--   encodes the semantic invariant explicitly — "one decision per item
--   per estimate" — matches the query filter pattern used everywhere, and
--   will remain correct if the data model ever allows an item to be shared
--   across estimates in a future revision-history feature.
--
-- The app uses:
--   .upsert({ ... }, { onConflict: 'estimate_id,estimate_item_id' })

CREATE UNIQUE INDEX IF NOT EXISTS idx_item_decisions_unique
  ON estimate_item_decisions (estimate_id, estimate_item_id);

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Identical tenant-isolation pattern used by estimate_item_parts (20240004).

ALTER TABLE estimate_item_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_estimate_item_decisions"
  ON estimate_item_decisions
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
