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
): Promise<{ data?: { workOrderId: string }; error?: string }> {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // ── Step 1: Load estimate and validate ──────────────────────────────────
  const { data: estimate, error: fetchEstimateErr } = await supabase
    .from('estimates')
    .select('id, tenant_id, customer_id, status')
    .eq('id', estimateId)
    .maybeSingle()

  if (fetchEstimateErr || !estimate) {
    return { error: 'Estimate not found.' }
  }

  // ── Step 2: Load approved items ─────────────────────────────────────────
  const { data: items, error: fetchItemsErr } = await supabase
    .from('estimate_items')
    .select('id, tenant_id, title, description, line_total')
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
    return { error: 'No approved items to create work order.' }
  }

  // ── Step 4: Check for existing work order (idempotency) ─────────────────
  const { data: existingWorkOrder, error: fetchWoErr } = await supabase
    .from('work_orders')
    .select('id')
    .eq('estimate_id', estimateId)
    .maybeSingle()

  if (fetchWoErr && fetchWoErr.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is expected
    return { error: 'Failed to check for existing work order.' }
  }

  if (existingWorkOrder) {
    // Work order already exists — return it (idempotent)
    return { data: { workOrderId: existingWorkOrder.id } }
  }

  // ── Step 5: Create new work order ──────────────────────────────────────
  const { data: newWorkOrder, error: createWoErr } = await supabase
    .from('work_orders')
    .insert({
      tenant_id: estimate.tenant_id,
      customer_id: estimate.customer_id,
      estimate_id: estimateId,
      status: 'pending',
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single()

  if (createWoErr || !newWorkOrder) {
    console.error('[finalizeEstimateApproval] Create WO failed:', createWoErr)
    return { error: 'Failed to create work order.' }
  }

  // ── Step 6: Create work order items from approved items ────────────────
  const workOrderItems = approvedItems.map(item => ({
    work_order_id: newWorkOrder.id,
    estimate_item_id: item.id,
    tenant_id: estimate.tenant_id,
    title: item.title,
    description: item.description,
    line_total: item.line_total,
    status: 'pending',
    created_at: now,
    updated_at: now,
  }))

  const { error: createItemsErr } = await supabase
    .from('work_order_items')
    .insert(workOrderItems)

  if (createItemsErr) {
    console.error('[finalizeEstimateApproval] Create items failed:', createItemsErr)
    // Rollback: delete orphaned work order
    await supabase.from('work_orders').delete().eq('id', newWorkOrder.id)
    return { error: 'Failed to create work order items.' }
  }

  // ── Step 7: Update estimate with approval metadata ────────────────────
  const { error: updateEstimateErr } = await supabase
    .from('estimates')
    .update({
      status: 'approved',
      approved_by_name: approvedByName,
      approval_method: 'in_person',
      approved_at: now,
      updated_at: now,
    })
    .eq('id', estimateId)

  if (updateEstimateErr) {
    console.error('[finalizeEstimateApproval] Update estimate failed:', updateEstimateErr)
    // Rollback: delete work order and items
    await supabase.from('work_order_items').delete().eq('work_order_id', newWorkOrder.id)
    await supabase.from('work_orders').delete().eq('id', newWorkOrder.id)
    return { error: 'Failed to update estimate.' }
  }

  // ── Success ─────────────────────────────────────────────────────────────
  return { data: { workOrderId: newWorkOrder.id } }
}
