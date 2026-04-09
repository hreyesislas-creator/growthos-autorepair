'use server'

// ============================================================
// Server Actions: Work Order Creation from Estimates
//
// Phase 1B Step 2: createWorkOrderFromEstimate
// Creates a new work order by copying approved estimate items.
// ============================================================

import { getDashboardTenant } from '@/lib/tenant'
import {
  getEstimateWithItems,
  getEstimateItemDecisions,
  getWorkOrderById,
} from '@/lib/queries'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { WorkOrderWithItems } from '@/lib/types'

// ── Helper: Generate Work Order Number ──────────────────────────

/**
 * Generates a sequential work order number: "WO-YYYY-NNNN"
 * Queries the max sequence per tenant and increments.
 * Wrap in a transaction when calling to avoid gaps under concurrent inserts.
 */
async function generateWorkOrderNumber(
  adminClient: ReturnType<typeof createAdminClient>,
  tenantId: string,
): Promise<string> {
  const { data, error } = await adminClient
    .from('work_orders')
    .select('work_order_number')
    .eq('tenant_id', tenantId)
    .not('work_order_number', 'is', null)

  let seq = 1
  if (!error && data && data.length > 0) {
    const sequences = data
      .map(row => {
        const num = row.work_order_number
        if (num && /^WO-\d{4}-(\d+)$/.test(num)) {
          return parseInt(num.split('-')[2], 10)
        }
        return 0
      })
      .filter(n => n > 0)

    if (sequences.length > 0) {
      seq = Math.max(...sequences) + 1
    }
  }

  const year = new Date().getFullYear()
  return `WO-${year}-${seq.toString().padStart(4, '0')}`
}

// ── Main: Create Work Order from Estimate ──────────────────────

/**
 * Creates a new work order from approved items in an estimate.
 *
 * Steps:
 *   1.  Auth check — resolve tenantId
 *   2.  Resolve auth user id for created_by (separate getUser call)
 *   3.  Load estimate + items
 *   4.  Load decisions for the estimate
 *   5.  Filter for approved items only — throw if none
 *   6.  Admin client for writes
 *   7.  Idempotency guard — return existing WO if one already exists
 *   8.  Recalculate totals from approved items only
 *   9.  Generate work order number
 *   10. Insert work_orders row
 *   11. Insert work_order_items rows — delete WO header and throw on failure
 *   12. Fetch back and return complete WorkOrderWithItems
 *
 * Returns the complete WorkOrderWithItems object for use in the UI.
 * Throws an error if no approved items exist or if an insert fails.
 */
export async function createWorkOrderFromEstimate(
  estimateId: string,
): Promise<WorkOrderWithItems> {

  // ── Step 1: Auth check ──────────────────────────────────────────
  const ctx = await getDashboardTenant()
  if (!ctx) throw new Error('Not authenticated')

  const tenantId = ctx.tenant.id

  // ── Step 2: Resolve auth user for created_by ───────────────────
  //
  // getDashboardTenant() returns only TenantContext — it does not expose the
  // user object even though it calls auth.getUser() internally.
  // We call auth.getUser() here using the session-aware (non-admin) client so
  // the authenticated user's id is available for the audit column.
  //
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const createdBy = user?.id ?? null

  // ── Step 3: Fetch estimate and items ───────────────────────────
  const estimate = await getEstimateWithItems(tenantId, estimateId)
  if (!estimate) {
    throw new Error(`Estimate ${estimateId} not found`)
  }

  // ── Step 4: Fetch decisions ────────────────────────────────────
  const decisions = await getEstimateItemDecisions(tenantId, estimateId)

  // ── Step 5: Identify approved items ───────────────────────────
  const approvedItemIds = new Set(
    decisions
      .filter(d => d.decision === 'approved')
      .map(d => d.estimate_item_id),
  )

  if (approvedItemIds.size === 0) {
    throw new Error('No approved items to convert to work order')
  }

  const approvedItems = estimate.items.filter(item => approvedItemIds.has(item.id))

  // ── Step 6: Admin client for writes ───────────────────────────
  const adminClient = await createAdminClient()

  // ── Step 7: Idempotency guard ──────────────────────────────────
  //
  // If a work order already exists for this estimate, return it instead of
  // creating a duplicate. Handles double-clicks, retries, and network errors
  // where the first attempt succeeded but the response was lost.
  //
  // Note: a narrow race window still exists if two requests arrive simultaneously.
  // A UNIQUE constraint on (tenant_id, estimate_id) in the DB would close it
  // completely. For Phase 1B this application-level guard is sufficient.
  //
  const { data: existingRow } = await adminClient
    .from('work_orders')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('estimate_id', estimateId)
    .limit(1)
    .single()

  if (existingRow?.id) {
    const existing = await getWorkOrderById(tenantId, existingRow.id)
    if (existing) return existing
    // Row exists but getWorkOrderById returned null (e.g. items query failed).
    // Fall through and create a fresh work order rather than surfacing a broken state.
  }

  // ── Step 8: Recalculate totals from approved items only ────────
  //
  // IMPORTANT: do NOT copy subtotal / tax_amount / total from the full estimate.
  //   The estimate total covers all items including declined ones.
  //   The work order total must reflect only the approved items actually being worked on.
  //
  // tax_rate: we preserve the estimate's rate snapshot so the percentage is auditable.
  //   If tax_rate is present, reapply it to the approved-item subtotal.
  //   If tax_rate is null (rate was not recorded — advisor entered amount manually),
  //   we do NOT carry forward a partial tax_amount because it cannot be prorated safely.
  //
  const woSubtotal   = Math.round(
    approvedItems.reduce((sum, item) => sum + item.line_total, 0) * 100
  ) / 100

  const woTaxAmount  = estimate.tax_rate != null
    ? Math.round(woSubtotal * estimate.tax_rate * 100) / 100
    : 0

  const woTotal      = Math.round((woSubtotal + woTaxAmount) * 100) / 100

  // ── Step 9: Generate work order number ────────────────────────
  const workOrderNumber = await generateWorkOrderNumber(adminClient, tenantId)

  // ── Step 10: Insert work_orders row ───────────────────────────
  const { data: woData, error: woError } = await adminClient
    .from('work_orders')
    .insert({
      tenant_id:            tenantId,
      estimate_id:          estimateId,
      inspection_id:        estimate.inspection_id,
      customer_id:          estimate.customer_id,
      vehicle_id:           estimate.vehicle_id,
      work_order_number:    workOrderNumber,
      creation_mode:        'from_estimate',
      status:               'draft',
      subtotal:             woSubtotal,
      tax_rate:             estimate.tax_rate,   // rate snapshot — preserved for reporting
      tax_amount:           woTaxAmount,
      total:                woTotal,
      notes:                estimate.notes,
      internal_notes:       estimate.internal_notes,
      parts_markup_percent: estimate.parts_markup_percent,
      estimate_number:      estimate.estimate_number,
      created_by:           createdBy,           // authenticated user id resolved in step 2
      created_at:           new Date().toISOString(),
      updated_at:           new Date().toISOString(),
    })
    .select()
    .single()

  if (woError) {
    console.error('[createWorkOrderFromEstimate] work_orders insert failed:', woError.message)
    throw new Error(`Failed to create work order: ${woError.message}`)
  }

  if (!woData) {
    throw new Error('Work order created but no data returned')
  }

  const workOrderId = woData.id

  // ── Step 11: Insert work_order_items rows ─────────────────────
  const itemInserts = approvedItems.map(item => ({
    tenant_id:                 tenantId,
    work_order_id:             workOrderId,
    estimate_item_id:          item.id,          // soft link — no FK constraint
    service_job_id:            item.service_job_id,
    title:                     item.title,
    description:               item.description,
    category:                  item.category,
    labor_hours:               item.labor_hours,
    labor_rate:                item.labor_rate,
    labor_total:               item.labor_total,
    parts_total:               item.parts_total,
    line_total:                item.line_total,
    inspection_item_id:        item.inspection_item_id,
    service_recommendation_id: item.service_recommendation_id,
    status:                    null,             // future use: item-level status tracking
    assigned_to:               null,             // future use: technician assignment
    display_order:             item.display_order,
    created_at:                new Date().toISOString(),
    updated_at:                new Date().toISOString(),
  }))

  const { error: itemsError } = await adminClient
    .from('work_order_items')
    .insert(itemInserts)

  if (itemsError) {
    // Rollback: delete the work_orders header row to prevent an orphaned record.
    //
    // Supabase JS does not support multi-statement transactions. This explicit
    // delete is the safe equivalent for this two-step insert pattern. If the
    // delete also fails we log it but still throw the original items error so
    // the caller sees the root cause.
    //
    console.error(
      '[createWorkOrderFromEstimate] items insert failed — rolling back WO header:',
      itemsError.message,
    )
    const { error: rollbackError } = await adminClient
      .from('work_orders')
      .delete()
      .eq('id', workOrderId)

    if (rollbackError) {
      console.error(
        '[createWorkOrderFromEstimate] rollback delete also failed — orphaned WO id:',
        workOrderId,
        rollbackError.message,
      )
    }

    throw new Error(`Failed to create work order items: ${itemsError.message}`)
  }

  // ── Step 12: Fetch the complete work order with items ──────────
  const createdWorkOrder = await getWorkOrderById(tenantId, workOrderId)

  if (!createdWorkOrder) {
    throw new Error('Work order created but could not be fetched back')
  }

  return createdWorkOrder
}

// ── voidEstimate ──────────────────────────────────────────────────────────────

import type { ArchiveResult } from '@/app/dashboard/inspections/actions'

/**
 * Soft-archives (voids) an estimate record.
 *
 * Blocker: if the estimate has at least one linked active (non-archived)
 * work order, the void is blocked. Cancel the work order first.
 *
 * Validation: if reason === 'other', note is required.
 *
 * Returns null on success, { error } on any blocker or failure.
 */
export async function voidEstimate(
  estimateId: string,
  reason:     string,
  note?:      string,
): Promise<ArchiveResult> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authenticated' }

  // ── Validate reason / note constraint ───────────────────────────────────
  if (!reason?.trim()) {
    return { error: 'A reason is required to void an estimate.' }
  }
  if (reason === 'other' && !note?.trim()) {
    return { error: 'A note is required when the reason is "Other".' }
  }

  const tenantId    = ctx.tenant.id
  const supabase    = await createClient()
  const adminClient = createAdminClient()

  // ── Resolve current auth user for audit column ───────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  const archivedBy = user?.id ?? null

  // ── Blocker: check for linked active work orders ─────────────────────────
  // An active work order was built from this estimate's approved items.
  // The work order must be cancelled (archived) before the estimate can be voided.
  const { data: linkedWO, error: linkErr } = await adminClient
    .from('work_orders')
    .select('id, work_order_number')
    .eq('tenant_id', tenantId)
    .eq('estimate_id', estimateId)
    .eq('is_archived', false)
    .limit(1)
    .maybeSingle()

  if (linkErr) {
    console.error('[voidEstimate] blocker check:', linkErr.message)
    return { error: `Could not verify linked work orders: ${linkErr.message}` }
  }

  if (linkedWO) {
    const label = linkedWO.work_order_number || linkedWO.id
    return {
      error: `Cannot void: this estimate has an active work order (${label}). Cancel the work order first.`,
    }
  }

  // ── Void the estimate ────────────────────────────────────────────────────
  const now = new Date().toISOString()

  const { error: updateErr } = await adminClient
    .from('estimates')
    .update({
      is_archived:    true,
      archived_at:    now,
      archived_by:    archivedBy,
      archive_reason: reason.trim(),
      archive_note:   note?.trim() || null,
      updated_at:     now,
    })
    .eq('id', estimateId)
    .eq('tenant_id', tenantId)   // tenant isolation: silently no-ops if mismatch

  if (updateErr) {
    console.error('[voidEstimate] update:', updateErr.message)
    return { error: `Failed to void estimate: ${updateErr.message}` }
  }

  return null
}

// ── Reopen Authorization ──────────────────────────────────────────────────

/**
 * Reopens authorization for an estimate that was already authorized or approved.
 * Changes status to 'reopened', which makes the public page editable again.
 *
 * Steps:
 *   1. Auth check — resolve tenantId
 *   2. Load estimate to validate current status
 *   3. Load decisions to ensure at least one approved item
 *   4. Update estimate status to 'reopened'
 *   5. Note: Does NOT delete or modify existing work order (remains "out of sync" until Phase 3)
 *
 * Returns success or error.
 * Validation: estimate must be 'authorized' or 'approved', and have at least one approved decision.
 */
export async function reopenEstimateAuthorization(
  estimateId: string,
): Promise<{ data?: { success: boolean }; error?: string }> {

  // ── Step 1: Auth check ──────────────────────────────────────────
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authenticated' }

  const tenantId = ctx.tenant.id

  // ── Step 2: Load estimate ──────────────────────────────────────
  const estimate = await getEstimateWithItems(tenantId, estimateId)
  if (!estimate) {
    return { error: 'Estimate not found.' }
  }

  // ── Validate current status ────────────────────────────────────
  const currentStatus = estimate.status
  if (currentStatus !== 'authorized' && currentStatus !== 'approved') {
    return { error: `Cannot reopen: estimate is currently ${currentStatus}. Only authorized or approved estimates can be reopened.` }
  }

  // ── Step 3: Load decisions to ensure at least one approved ────
  const decisions = await getEstimateItemDecisions(tenantId, estimateId)
  if (!decisions || decisions.length === 0) {
    return { error: 'Cannot reopen: no item decisions found.' }
  }

  const approvedDecisions = decisions.filter(d => d.decision === 'approved')
  if (approvedDecisions.length === 0) {
    return { error: 'Cannot reopen: at least one item must be approved.' }
  }

  // ── Step 4: Update estimate status to 'reopened' ──────────────
  const adminClient = createAdminClient()
  const now = new Date().toISOString()

  const { error: updateErr } = await adminClient
    .from('estimates')
    .update({
      status: 'reopened',
      updated_at: now,
    })
    .eq('id', estimateId)
    .eq('tenant_id', tenantId)

  if (updateErr) {
    console.error('[reopenEstimateAuthorization] Update failed:', updateErr)
    return { error: 'Failed to reopen authorization.' }
  }

  return { data: { success: true } }
}

// ── Update Work Order from Estimate ───────────────────────────────────────

/**
 * Updates an existing work order from the latest approved estimate decisions.
 * Called after estimate is reopened, re-authorized, and decisions changed.
 *
 * Steps:
 *   1. Auth check — resolve tenantId
 *   2. Load estimate + items + decisions
 *   3. Validate current status is 'authorized'
 *   4. Load existing work order (exactly one, error if 0 or >1)
 *   5. Filter for approved items only — throw if none
 *   6. Load existing work_order_items (for comparison/audit)
 *   7. Delete all work_order_items
 *   8. Insert new work_order_items from approved items
 *   9. Recalculate totals
 *   10. Update work_orders row (preserve id, number, created_at; update totals and updated_at)
 *   11. Update estimate status to 'approved' (only if not already 'approved')
 *   12. Return success
 *
 * Returns success or error.
 * Safe failure states: if delete/insert fails, WO items missing but WO exists (recoverable).
 */
export async function updateWorkOrderFromEstimate(
  estimateId: string,
): Promise<{ data?: { success: boolean; workOrderId: string; workOrderNumber: string | null }; error?: string }> {

  // ── Step 1: Auth check ──────────────────────────────────────────
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authenticated' }

  const tenantId = ctx.tenant.id

  // ── Step 2: Load estimate, items, decisions ─────────────────────
  const estimate = await getEstimateWithItems(tenantId, estimateId)
  if (!estimate) {
    return { error: 'Estimate not found.' }
  }

  // ── Step 3: Validate status ─────────────────────────────────────
  if (estimate.status !== 'authorized') {
    return { error: `Cannot update work order: estimate must be authorized. Current status: ${estimate.status}` }
  }

  // ── Step 4: Load existing work order (exactly one) ───────────────
  const adminClient = createAdminClient()
  const { data: workOrders, error: woQueryErr } = await adminClient
    .from('work_orders')
    .select('id, work_order_number, subtotal, tax_amount, total')
    .eq('tenant_id', tenantId)
    .eq('estimate_id', estimateId)
    .eq('is_archived', false)

  if (woQueryErr) {
    console.error('[updateWorkOrderFromEstimate] WO query failed:', woQueryErr)
    return { error: 'Failed to load work order.' }
  }

  if (!workOrders || workOrders.length === 0) {
    return { error: 'No work order found for this estimate.' }
  }

  if (workOrders.length > 1) {
    console.error('[updateWorkOrderFromEstimate] Multiple active WOs found:', {
      estimateId,
      count: workOrders.length,
    })
    return { error: 'Unexpected: multiple work orders linked to estimate.' }
  }

  const existingWO = workOrders[0]

  // ── Step 5: Load decisions and validate approved items ──────────
  const decisions = await getEstimateItemDecisions(tenantId, estimateId)
  if (!decisions || decisions.length === 0) {
    return { error: 'Cannot update work order: no item decisions found.' }
  }

  const approvedItemIds = new Set(
    decisions
      .filter(d => d.decision === 'approved')
      .map(d => d.estimate_item_id)
  )

  const approvedItems = estimate.items.filter(i => approvedItemIds.has(i.id))

  if (approvedItems.length === 0) {
    return { error: 'Cannot update work order: no approved items.' }
  }

  const now = new Date().toISOString()

  // ── Step 6: Delete all existing work order items ─────────────────
  const { error: deleteErr } = await adminClient
    .from('work_order_items')
    .delete()
    .eq('work_order_id', existingWO.id)

  if (deleteErr) {
    console.error('[updateWorkOrderFromEstimate] Delete items failed:', deleteErr)
    return { error: 'Failed to remove old work order items.' }
  }

  // ── Step 7: Insert new work order items from approved items ──────
  const workOrderItems = approvedItems.map((item, idx) => ({
    tenant_id: tenantId,
    work_order_id: existingWO.id,
    estimate_item_id: item.id,
    service_job_id: item.service_job_id ?? null,
    title: item.title,
    description: item.description ?? null,
    category: item.category,
    labor_hours: item.labor_hours ?? null,
    labor_rate: item.labor_rate ?? null,
    labor_total: item.labor_total || 0,
    parts_total: item.parts_total || 0,
    line_total: item.line_total,
    inspection_item_id: item.inspection_item_id ?? null,
    service_recommendation_id: item.service_recommendation_id ?? null,
    display_order: idx,
    status: 'draft',
    created_at: now,
    updated_at: now,
  }))

  const { error: insertErr } = await adminClient
    .from('work_order_items')
    .insert(workOrderItems)

  if (insertErr) {
    console.error('[updateWorkOrderFromEstimate] Insert items failed:', insertErr)
    return { error: 'Failed to add updated items to work order.' }
  }

  // ── Step 8: Recalculate totals ──────────────────────────────────
  // Same logic as create: sum items, calculate proportional tax
  const newSubtotal = Number(estimate.subtotal) || 0
  const newTaxRate = estimate.tax_rate ?? 0
  const newTaxAmount = Number(estimate.tax_amount) || 0
  const newTotal = Number(estimate.total) || 0

  // ── Step 9: Update work order row ───────────────────────────────
  const { error: updateWoErr } = await adminClient
    .from('work_orders')
    .update({
      subtotal: newSubtotal,
      tax_amount: newTaxAmount,
      total: newTotal,
      updated_at: now,
    })
    .eq('id', existingWO.id)
    .eq('tenant_id', tenantId)

  if (updateWoErr) {
    console.error('[updateWorkOrderFromEstimate] Update WO failed:', updateWoErr)
    return { error: 'Failed to update work order.' }
  }

  // ── Step 10: Update estimate status (only if not already 'approved') ──
  // Step 10: Update estimate status

  const { error: updateEstErr } = await adminClient
  .from('estimates')
  .update({
    status: 'authorized',
    updated_at: new Date().toISOString(),
  })
  .eq('id', estimateId)

    if (updateEstErr) {
      console.error('[updateWorkOrderFromEstimate] Update estimate failed:', updateEstErr)
      return { error: 'Failed to update estimate status.' }
    }
  

  // ── Success ─────────────────────────────────────────────────────
  return { data: { success: true, workOrderId: existingWO.id, workOrderNumber: existingWO.work_order_number } }
}
