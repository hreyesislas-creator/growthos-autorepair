-- =============================================================================
-- GrowthOS AutoRepair — Estimate System (Stage 1 architecture)
-- Run once in the Supabase SQL editor for each environment.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) estimates  — one header record per estimate
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS estimates (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid        NOT NULL,
  inspection_id     uuid,                     -- nullable: estimates can exist without inspections
  customer_id       uuid,
  vehicle_id        uuid,

  -- Human-readable identifier, e.g. "EST-2024-0042"
  -- Generated application-side; unique per tenant.
  estimate_number   text        NOT NULL,

  -- How the estimate was created.  All three modes produce the same row shape.
  creation_mode     text        NOT NULL DEFAULT 'manual_entry'
                    CHECK (creation_mode IN ('manual_entry', 'pdf_import', 'system_generated')),

  status            text        NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'sent', 'approved', 'declined')),

  -- Subtotal buckets — optional but enable clean breakdowns in the UI.
  subtotal_labor    numeric(10,2),
  subtotal_parts    numeric(10,2),
  subtotal_other    numeric(10,2),
  subtotal          numeric(10,2) NOT NULL DEFAULT 0,

  -- Tax:
  --   tax_rate   — snapshot of the rate applied (e.g. 0.0875 for 8.75%).
  --                NULL when tax was entered manually without a rate.
  --                Populated automatically once city/county tax rules exist.
  --   tax_amount — the dollar amount of tax.  Always authoritative.
  --                If tax_rate is set: tax_amount = subtotal * tax_rate (computed, then saved).
  --                If tax_rate is null: tax_amount is whatever the advisor typed.
  tax_rate          numeric(8,6),             -- e.g. 0.087500  (stored as fraction, not %)
  tax_amount        numeric(10,2) NOT NULL DEFAULT 0,

  total             numeric(10,2) NOT NULL DEFAULT 0,  -- subtotal + tax_amount

  notes             text,                     -- customer-facing notes / scope of work
  internal_notes    text,                     -- shop-internal only

  -- PDF import linkage (populated only when creation_mode = 'pdf_import')
  source_file_url   text,                     -- Storage URL of the uploaded PDF
  parse_confidence  numeric(5,2),             -- 0–100 score from the parser
  requires_review   boolean     NOT NULL DEFAULT false,

  created_by        uuid,                     -- auth.users.id of the creating user
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- One active draft estimate per inspection (soft constraint — enforced in app code).
-- We do not use a DB UNIQUE constraint because multiple historical estimates
-- per inspection will be valid in a future revision-history feature.
CREATE INDEX IF NOT EXISTS idx_estimates_tenant        ON estimates (tenant_id);
CREATE INDEX IF NOT EXISTS idx_estimates_inspection    ON estimates (tenant_id, inspection_id);
CREATE INDEX IF NOT EXISTS idx_estimates_customer      ON estimates (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status        ON estimates (tenant_id, status);

-- Unique estimate number per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_estimates_number
  ON estimates (tenant_id, estimate_number);

-- ---------------------------------------------------------------------------
-- B) estimate_items  — line items belonging to an estimate
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS estimate_items (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   uuid        NOT NULL,
  estimate_id                 uuid        NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,

  -- Optional FKs back to the objects that sourced this line item.
  -- Both are nullable — items can also be entered manually with no linkage.
  service_recommendation_id   uuid,       -- FK to service_recommendations(id)
  inspection_item_id          uuid,       -- FK to inspection_items(id)

  -- How this line item was produced.
  source_type   text  NOT NULL DEFAULT 'manual'
                CHECK (source_type IN ('manual', 'pdf_import', 'generated', 'recommendation')),

  -- What the line item represents.
  category      text  NOT NULL DEFAULT 'misc'
                CHECK (category IN ('labor', 'part', 'fee', 'tax', 'misc')),

  title         text        NOT NULL,
  description   text,
  quantity      numeric(10,3) NOT NULL DEFAULT 1,
  unit_price    numeric(10,2) NOT NULL DEFAULT 0,
  line_total    numeric(10,2) NOT NULL DEFAULT 0,  -- = ROUND(quantity * unit_price, 2)

  display_order integer     NOT NULL DEFAULT 0,    -- controls sort order in the UI

  -- For PDF-imported items: where in the source doc this line was found.
  -- E.g. "page 2, line 7" or a raw extracted string.
  source_reference  text,

  -- Flagged true when the parser is uncertain about this line item and
  -- the advisor must confirm it before the estimate is sent.
  needs_review  boolean     NOT NULL DEFAULT false,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate
  ON estimate_items (estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_items_recommendation
  ON estimate_items (service_recommendation_id)
  WHERE service_recommendation_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- C) estimate_source_files  — PDF / external file import tracking
--    Only needed when creation_mode = 'pdf_import'.
--    Kept separate so the estimates table stays clean.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS estimate_source_files (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL,
  estimate_id     uuid        REFERENCES estimates(id) ON DELETE SET NULL,

  file_name       text        NOT NULL,
  file_url        text        NOT NULL,   -- Supabase Storage signed/public URL
  file_size_bytes integer,
  mime_type       text,

  parse_status    text        NOT NULL DEFAULT 'pending'
                  CHECK (parse_status IN ('pending', 'processing', 'completed', 'failed')),

  -- Raw extraction output stored as JSON for debugging / re-processing.
  parse_result    jsonb,
  parse_error     text,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estimate_source_files_estimate
  ON estimate_source_files (estimate_id)
  WHERE estimate_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- D) Row-Level Security
--    Pattern: each table is visible only to the owning tenant.
--    Add after confirming your RLS helper function name matches the project.
-- ---------------------------------------------------------------------------

ALTER TABLE estimates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_source_files ENABLE ROW LEVEL SECURITY;

-- Replace get_my_tenant_id() with whatever your project uses to surface
-- the current user's tenant.  Common patterns:
--   auth.jwt() ->> 'tenant_id'
--   (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1)

-- Example policies (adjust the tenant-resolution expression for your project):
/*
CREATE POLICY "tenant_estimates" ON estimates
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "tenant_estimate_items" ON estimate_items
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "tenant_estimate_source_files" ON estimate_source_files
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
*/

-- ---------------------------------------------------------------------------
-- E) Estimate number helper function
--    Generates a sequential per-tenant number: "EST-YYYY-NNNN"
--    Wrap in a transaction when calling from application code to avoid gaps
--    under concurrent inserts.  For Stage 1 app-side generation is fine.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION generate_estimate_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  seq integer;
BEGIN
  SELECT COALESCE(
    MAX(
      CASE
        WHEN estimate_number ~ '^EST-[0-9]{4}-[0-9]+$'
        THEN CAST(SPLIT_PART(estimate_number, '-', 3) AS integer)
        ELSE 0
      END
    ), 0
  ) + 1
  INTO seq
  FROM estimates
  WHERE tenant_id = p_tenant_id;

  RETURN 'EST-' || EXTRACT(YEAR FROM now())::text
         || '-'  || LPAD(seq::text, 4, '0');
END;
$$;
