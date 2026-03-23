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
