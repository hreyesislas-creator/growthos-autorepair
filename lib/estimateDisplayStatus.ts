/**
 * estimateDisplayStatus.ts
 *
 * Pure, side-effect-free helpers for deriving a human-readable display status
 * and a decision summary from `estimate_item_decisions` rows.
 *
 * IMPORTANT:
 *   - These functions NEVER write to the database.
 *   - `estimates.status` (the DB column) is never modified by this module.
 *   - Display status is a UI-only concept; the raw DB status is preserved for
 *     business logic (work-order gating, billing, external APIs).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal shape needed from a decision row — avoids importing the full type. */
interface DecisionRow {
  decision: string   // 'approved' | 'declined'
}

export interface DecisionSummary {
  approvedCount: number
  declinedCount: number
  pendingCount:  number
  totalCount:    number
}

// ─────────────────────────────────────────────────────────────────────────────
// getDecisionSummary
//
// Counts approved, declined, and pending (absent) items given the total item
// count and the rows that exist in estimate_item_decisions.
//
// Absence-as-pending: a missing row means the item is still pending.
// ─────────────────────────────────────────────────────────────────────────────

export function getDecisionSummary(
  totalItemCount: number,
  decisions:      DecisionRow[],
): DecisionSummary {
  const approvedCount = decisions.filter(d => d.decision === 'approved').length
  const declinedCount = decisions.filter(d => d.decision === 'declined').length
  const pendingCount  = Math.max(0, totalItemCount - approvedCount - declinedCount)
  return { approvedCount, declinedCount, pendingCount, totalCount: totalItemCount }
}

// ─────────────────────────────────────────────────────────────────────────────
// deriveDisplayStatus
//
// Priority order (evaluated top-to-bottom):
//
//   1. dbStatus === 'draft' AND no decisions yet         → 'Pending'
//      dbStatus === 'draft' AND decisions exist          → fall through to counts
//   2. totalItemCount === 0                              → plain dbStatus label
//   3. approvedCount === 0 AND declinedCount === 0       → 'Presented'
//   4. pendingCount > 0                                  → 'Customer Responding'
//   5. approvedCount > 0 AND declinedCount === 0         → 'Approved'
//   6. approvedCount === 0 AND declinedCount > 0         → 'Declined'
//   7. approvedCount > 0 AND declinedCount > 0           → 'Partially Approved'
//
// dbStatus drives step 1 only — it is NOT a hard override for any other step.
// This prevents a 'draft' estimate with recorded decisions from being stuck at
// 'Pending', and prevents manually-set 'approved'/'declined' DB values from
// shadowing the actual item-level decision counts.
// ─────────────────────────────────────────────────────────────────────────────

export function deriveDisplayStatus(
  dbStatus:       string,
  totalItemCount: number,
  decisions:      DecisionRow[],
): string {
  // Step 1 — if the estimate is a draft AND no decisions have been recorded yet,
  // it has never been interacted with. Return 'Pending' immediately.
  //
  // If the advisor visited the present view and recorded decisions on a draft
  // (without pressing "Present to Customer"), decisions still exist and we fall
  // through to count-based derivation so the real state is surfaced.
  if (dbStatus === 'draft') {
    const { approvedCount, declinedCount } = getDecisionSummary(totalItemCount, decisions)
    if (approvedCount === 0 && declinedCount === 0) return 'Pending'
    // Decisions exist on a draft — fall through to count-based logic below.
  }

  // Step 2 — zero-item estimates: fall back to a plain label for the DB status.
  if (totalItemCount === 0) {
    if (dbStatus === 'draft')    return 'Pending'
    if (dbStatus === 'approved') return 'Approved'
    if (dbStatus === 'declined') return 'Declined'
    return 'Presented'   // sent or any unknown value
  }

  // Steps 3–7 derive purely from decision counts; dbStatus is not consulted.
  const { approvedCount, declinedCount, pendingCount } =
    getDecisionSummary(totalItemCount, decisions)

  // Step 3 — no decisions recorded yet.
  if (approvedCount === 0 && declinedCount === 0) return 'Presented'

  // Step 4 — customer has started but not finished.
  if (pendingCount > 0) return 'Customer Responding'

  // Steps 5–7 — all items decided; classify the outcome.
  if (approvedCount > 0 && declinedCount === 0) return 'Approved'
  if (approvedCount === 0 && declinedCount > 0) return 'Declined'
  if (approvedCount > 0 && declinedCount > 0)   return 'Partially Approved'

  // Defensive fallback (should not be reached).
  return 'Presented'
}
