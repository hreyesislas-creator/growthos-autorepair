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

  // ── DIAGNOSTIC: Log incoming params ──────────────────────────────────────
  console.log('[approveEstimateItem] incoming:', {
    estimateId,
    itemId,
    timestamp: now,
  })

  // Validate item belongs to this estimate + get tenant_id
  const { data: item, error: validationError } = await supabase
    .from('estimate_items')
    .select('id, tenant_id, estimate_id')
    .eq('id', itemId)
    .eq('estimate_id', estimateId)
    .maybeSingle()

  // ── DIAGNOSTIC: Log validation result ────────────────────────────────────
  console.log('[approveEstimateItem] validation query result:', {
    itemFound: !!item,
    itemId: item?.id ?? null,
    itemEstimateId: item?.estimate_id ?? null,
    itemTenantId: item?.tenant_id ?? null,
    validationError: validationError?.message ?? null,
  })

  if (!item) {
    const errorMsg = `Item not found. (itemId: ${itemId}, estimateId: ${estimateId})`
    console.error('[approveEstimateItem] validation failed:', errorMsg)
    return { error: errorMsg }
  }

  // ── DIAGNOSTIC: About to upsert ──────────────────────────────────────────
  console.log('[approveEstimateItem] attempting upsert...')

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

  // ── DIAGNOSTIC: Log upsert result ────────────────────────────────────────
  if (error) {
    console.error('[approveEstimateItem] upsert failed:', {
      error: error.message,
      code: (error as any).code,
      details: (error as any).details,
    })
    return { error: `Upsert failed: ${error.message}` }
  }

  console.log('[approveEstimateItem] upsert succeeded')
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

  // ── DIAGNOSTIC: Log incoming params ──────────────────────────────────────
  console.log('[declineEstimateItem] incoming:', {
    estimateId,
    itemId,
    timestamp: now,
  })

  // Validate item belongs to this estimate + get tenant_id
  const { data: item, error: validationError } = await supabase
    .from('estimate_items')
    .select('id, tenant_id, estimate_id')
    .eq('id', itemId)
    .eq('estimate_id', estimateId)
    .maybeSingle()

  // ── DIAGNOSTIC: Log validation result ────────────────────────────────────
  console.log('[declineEstimateItem] validation query result:', {
    itemFound: !!item,
    itemId: item?.id ?? null,
    itemEstimateId: item?.estimate_id ?? null,
    itemTenantId: item?.tenant_id ?? null,
    validationError: validationError?.message ?? null,
  })

  if (!item) {
    const errorMsg = `Item not found. (itemId: ${itemId}, estimateId: ${estimateId})`
    console.error('[declineEstimateItem] validation failed:', errorMsg)
    return { error: errorMsg }
  }

  // ── DIAGNOSTIC: About to upsert ──────────────────────────────────────────
  console.log('[declineEstimateItem] attempting upsert...')

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

  // ── DIAGNOSTIC: Log upsert result ────────────────────────────────────────
  if (error) {
    console.error('[declineEstimateItem] upsert failed:', {
      error: error.message,
      code: (error as any).code,
      details: (error as any).details,
    })
    return { error: `Upsert failed: ${error.message}` }
  }

  console.log('[declineEstimateItem] upsert succeeded')
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

// ── Final Authorization & Work Order Creation ──────────────────────────────

/**
 * Finalize estimate authorization and create work order from approved items.
 * Public version for unauthenticated customers.
 *
 * Flow:
 * 1. Validate estimate exists and has approved items
 * 2. Check for existing work order (idempotency)
 * 3. If exists → return it
 * 4. If not → create new work order from approved items
 * 5. Update estimate with approval metadata
 * 6. Return workOrderId
 */
export async function finalizeEstimateApproval(
  estimateId: string,
  approvedByName: string | null,
): Promise<{ data?: { authorized: boolean; workOrderId: string | null }; error?: string }> {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // ── Step 1: Load estimate and validate ──────────────────────────────────
  const { data: estimate, error: fetchEstimateErr } = await supabase
    .from('estimates')
    .select('id, tenant_id, customer_id, vehicle_id, inspection_id, status, estimate_number, subtotal, tax_rate, tax_amount, total, parts_markup_percent')
    .eq('id', estimateId)
    .maybeSingle()

  if (fetchEstimateErr || !estimate) {
    return { error: 'Estimate not found.' }
  }

  // ── Step 2: Load approved items ─────────────────────────────────────────
  const { data: items, error: fetchItemsErr } = await supabase
    .from('estimate_items')
    .select('*')
    .eq('estimate_id', estimateId)

  if (fetchItemsErr) {
    return { error: 'Failed to load estimate items.' }
  }

  // ── Step 3: Load item decisions to find approved items ──────────────────
  const { data: decisions, error: fetchDecisionsErr } = await supabase
    .from('estimate_item_decisions')
    .select('estimate_item_id, decision')
    .eq('estimate_id', estimateId)

  if (fetchDecisionsErr) {
    return { error: 'Failed to load item decisions.' }
  }

  const approvedItemIds = new Set(
    decisions
      .filter(d => d.decision === 'approved')
      .map(d => d.estimate_item_id)
  )

  const approvedItems = items.filter(i => approvedItemIds.has(i.id))

  if (approvedItems.length === 0) {
    return { error: 'No approved items to authorize estimate.' }
  }

  // ── Step 4: Check for existing work order (backward compat) ────────────
  const { data: existingWorkOrder, error: fetchWoErr } = await supabase
    .from('work_orders')
    .select('id')
    .eq('estimate_id', estimateId)
    .maybeSingle()

  if (fetchWoErr && fetchWoErr.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is expected
    return { error: 'Failed to check for existing work order.' }
  }

  // ── Phase 1+3: Mark estimate as 'authorized' ──────────────────────────
  // This applies whether or not a work order already exists.
  // If WO exists (pre-Phase 1 code path), we still update status so the internal
  // UI can show "Update Work Order" button when appropriate (Phase 3).
  const { error: updateEstimateErr } = await supabase
    .from('estimates')
    .update({
      status: 'authorized',
      approved_by_name: approvedByName,
      updated_at: now,
    })
    .eq('id', estimateId)

  if (updateEstimateErr) {
    console.error('[finalizeEstimateApproval] Update estimate failed:', updateEstimateErr)
    return { error: 'Failed to authorize estimate.' }
  }

  // ── Success ─────────────────────────────────────────────────────────────
  // If an existing work order was found, return it; otherwise null (Phase 1 flow)
  if (existingWorkOrder) {
    return { data: { authorized: true, workOrderId: existingWorkOrder.id } }
  }

  return { data: { authorized: true, workOrderId: null } }
}
