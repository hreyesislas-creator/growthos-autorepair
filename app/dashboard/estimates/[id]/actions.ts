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
