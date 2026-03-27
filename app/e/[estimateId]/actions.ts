'use server'

/**
 * Public server actions for the customer-facing estimate presentation page.
 *
 * These actions use the service-role admin client because the page is unauthenticated.
 * Security model: the estimate UUID (128-bit random) acts as the access token —
 * the same pattern used by Stripe payment links, Calendly, etc.
 *
 * No tenant scoping is needed here because:
 *   - The caller already has the estimate UUID (unguessable)
 *   - We validate the estimate exists before writing
 */

import { createAdminClient } from '@/lib/supabase/server'

// ── Approve ────────────────────────────────────────────────────────────────────

/**
 * Customer approves the estimate.
 *
 * Idempotent — calling again on an already-approved estimate is a no-op.
 * The `updated_at` timestamp doubles as the decision timestamp until
 * dedicated `customer_approved_at` / `customer_declined_at` columns are added.
 *
 * Future: trigger SMS/email confirmation to shop on approval.
 */
export async function approveEstimate(
  estimateId: string,
): Promise<{ error: string } | null> {
  const supabase = createAdminClient()

  const { data: estimate, error: fetchErr } = await supabase
    .from('estimates')
    .select('id, status')
    .eq('id', estimateId)
    .maybeSingle()

  if (fetchErr || !estimate) return { error: 'Estimate not found.' }

  // Idempotent — already approved
  if (estimate.status === 'approved') return null

  const { error } = await supabase
    .from('estimates')
    .update({
      status:     'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', estimateId)

  if (error) {
    console.error('[approveEstimate]', error.message)
    return { error: error.message }
  }

  return null
}

// ── Decline ────────────────────────────────────────────────────────────────────

/**
 * Customer declines the estimate.
 *
 * Idempotent — calling again on an already-declined estimate is a no-op.
 *
 * The declined status + updated_at are retained for future SMS follow-up
 * campaigns. Do NOT delete declined estimates — they are the raw material
 * for win-back automations.
 */
export async function declineEstimate(
  estimateId: string,
): Promise<{ error: string } | null> {
  const supabase = createAdminClient()

  const { data: estimate, error: fetchErr } = await supabase
    .from('estimates')
    .select('id, status')
    .eq('id', estimateId)
    .maybeSingle()

  if (fetchErr || !estimate) return { error: 'Estimate not found.' }

  // Idempotent — already declined
  if (estimate.status === 'declined') return null

  const { error } = await supabase
    .from('estimates')
    .update({
      status:     'declined',
      updated_at: new Date().toISOString(),
    })
    .eq('id', estimateId)

  if (error) {
    console.error('[declineEstimate]', error.message)
    return { error: error.message }
  }

  return null
}

// ── Per-job customer decision actions ───────────────────────────────────────
//
// Public versions of per-item approval (for customers via public link).
// Uses the estimate UUID as access token (no auth needed).
// Validates that the item belongs to the estimate before writing.

/**
 * Customer approves a single repair job/line item.
 * Idempotent — upsert means calling twice is a no-op.
 * Changing from 'declined' → 'approved' is also a single round-trip.
 */
export async function approveEstimateItem(
  estimateId: string,
  itemId:     string,
): Promise<{ error: string } | null> {
  const supabase = createAdminClient()
  const now      = new Date().toISOString()

  // Validate item belongs to this estimate + get tenant_id
  const { data: item } = await supabase
    .from('estimate_items')
    .select('id, tenant_id')
    .eq('id', itemId)
    .eq('estimate_id', estimateId)
    .maybeSingle()

  if (!item) return { error: 'Item not found.' }

  const { error } = await supabase
    .from('estimate_item_decisions')
    .upsert(
      {
        tenant_id:        item.tenant_id,
        estimate_id:      estimateId,
        estimate_item_id: itemId,
        decision:         'approved',
        decided_by:       null,
        decided_at:       now,
        updated_at:       now,
      },
      { onConflict: 'estimate_id,estimate_item_id' },
    )

  if (error) {
    console.error('[approveEstimateItem]', error.message)
    return { error: error.message }
  }

  return null
}

/**
 * Customer declines a single repair job/line item.
 * Idempotent — upsert means calling twice is a no-op.
 * Changing from 'approved' → 'declined' is also a single round-trip.
 */
export async function declineEstimateItem(
  estimateId: string,
  itemId:     string,
): Promise<{ error: string } | null> {
  const supabase = createAdminClient()
  const now      = new Date().toISOString()

  // Validate item belongs to this estimate + get tenant_id
  const { data: item } = await supabase
    .from('estimate_items')
    .select('id, tenant_id')
    .eq('id', itemId)
    .eq('estimate_id', estimateId)
    .maybeSingle()

  if (!item) return { error: 'Item not found.' }

  const { error } = await supabase
    .from('estimate_item_decisions')
    .upsert(
      {
        tenant_id:        item.tenant_id,
        estimate_id:      estimateId,
        estimate_item_id: itemId,
        decision:         'declined',
        decided_by:       null,
        decided_at:       now,
        updated_at:       now,
      },
      { onConflict: 'estimate_id,estimate_item_id' },
    )

  if (error) {
    console.error('[declineEstimateItem]', error.message)
    return { error: error.message }
  }

  return null
}

/**
 * Customer undoes a decision for a single item (returns to pending state).
 * Deletes the row — absence of a row means pending.
 */
export async function undecideEstimateItem(
  estimateId: string,
  itemId:     string,
): Promise<{ error: string } | null> {
  const supabase = createAdminClient()

  // Validate item belongs to this estimate
  const { data: item } = await supabase
    .from('estimate_items')
    .select('id, tenant_id')
    .eq('id', itemId)
    .eq('estimate_id', estimateId)
    .maybeSingle()

  if (!item) return { error: 'Item not found.' }

  const { error } = await supabase
    .from('estimate_item_decisions')
    .delete()
    .eq('estimate_id', estimateId)
    .eq('estimate_item_id', itemId)

  if (error) {
    console.error('[undecideEstimateItem]', error.message)
    return { error: error.message }
  }

  return null
}
