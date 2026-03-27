-- =============================================================================
-- GrowthOS AutoRepair — A1: Add item_name to service_recommendations
-- Unblocks inspection save functionality (saveInspectionResults)
-- Minimal fix only — adds single required column
-- =============================================================================

ALTER TABLE service_recommendations
  ADD COLUMN IF NOT EXISTS item_name text;
