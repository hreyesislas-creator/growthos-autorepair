'use server'

import {
  getCurrentDashboardTenantUser,
  denyUnlessMayMutateWorkOrder,
  canAssignOperationalTechnician,
} from '@/lib/auth/operational-assignment'
import {
  denyUnlessCanEditAllDashboardModules,
  denyUnlessCanEditDashboardModule,
} from '@/lib/auth/roles'
import { getDashboardTenant } from '@/lib/tenant'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorkOrderOperationalStatus, WorkOrderStatus } from '@/lib/types'
import type { ArchiveResult } from '@/app/dashboard/inspections/actions'

// ── Shared shape returned by time-tracking actions ────────────────────────────
// Gives the client the exact timestamps the DB recorded, so optimistic UI
// can be corrected to the real server value before router.refresh() fires.

export interface WorkOrderTimeSnapshot {
  id:           string
  status:       WorkOrderStatus
  started_at:   string | null
  completed_at: string | null
  /** Elapsed hours written by completeWorkOrder. NULL for other transitions. */
  actual_hours: number | null
  updated_at:   string
}

/**
 * Ensures a primary technician row exists in work_order_assignments for work_orders.technician_id.
 * Does not delete other assignment rows. Idempotent for the same technician.
 */
async function ensurePrimaryTechnicianAssignmentForWorkOrder(
  adminClient: SupabaseClient,
  tenantId: string,
  workOrderId: string,
  technicianTenantUserId: string,
): Promise<void> {
  const now = new Date().toISOString()

  const { data: techRow, error: selErr } = await adminClient
    .from('work_order_assignments')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('work_order_id', workOrderId)
    .eq('tenant_user_id', technicianTenantUserId)
    .eq('assignment_role', 'technician')
    .limit(1)
    .maybeSingle()

  if (selErr) {
    console.error('[ensurePrimaryTechnicianAssignmentForWorkOrder] select', selErr.message)
    return
  }

  if (techRow?.id) {
    const { error } = await adminClient
      .from('work_order_assignments')
      .update({
        is_primary: true,
        updated_at: now,
      })
      .eq('id', techRow.id)
      .eq('tenant_id', tenantId)
    if (error) console.error('[ensurePrimaryTechnicianAssignmentForWorkOrder] update', error.message)
    return
  }

  const { error } = await adminClient.from('work_order_assignments').insert({
    tenant_id: tenantId,
    work_order_id: workOrderId,
    tenant_user_id: technicianTenantUserId,
    assignment_role: 'technician',
    is_primary: true,
    updated_at: now,
  })
  if (error) console.error('[ensurePrimaryTechnicianAssignmentForWorkOrder] insert', error.message)
}

// ── updateWorkOrderStatus ─────────────────────────────────────────────────────

/**
 * General-purpose status update (e.g. draft → ready).
 * Does NOT set time-tracking fields — use startWorkOrder / completeWorkOrder for that.
 *
 * Returns void. Caller must call router.refresh() to sync server state.
 */
export async function updateWorkOrderStatus(
  workOrderId: string,
  newStatus:   WorkOrderStatus,
): Promise<void> {
  const ctx = await getDashboardTenant()
  if (!ctx) throw new Error('Not authenticated')

  const statusDenied = await denyUnlessCanEditDashboardModule('work_orders')
  if (statusDenied) throw new Error(statusDenied.error)

  const tenantId    = ctx.tenant.id
  const woAssignDenied = await denyUnlessMayMutateWorkOrder(workOrderId, tenantId)
  if (woAssignDenied) throw new Error(woAssignDenied.error)

  const adminClient = await createAdminClient()

  const { error } = await adminClient
    .from('work_orders')
    .update({
      status:     newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id',        workOrderId)
    .eq('tenant_id', tenantId)   // tenant isolation: silently no-ops if tenant mismatch

  if (error) {
    console.error('[updateWorkOrderStatus]', error.message)
    throw new Error(`Failed to update work order status: ${error.message}`)
  }
}

const OPERATIONAL_STATUS_VALUES = new Set<WorkOrderOperationalStatus>([
  'waiting_on_parts',
  'waiting_on_customer',
  'waiting_on_insurance',
  'waiting_on_sublet',
  'on_hold',
  'need_to_order_parts',
])

/**
 * Updates only operational_status (job board sub-tag). Does not touch lifecycle status
 * or time-tracking fields. Pass null to clear.
 */
export async function updateWorkOrderOperationalStatus(
  workOrderId: string,
  operationalStatus: WorkOrderOperationalStatus | null,
): Promise<void> {
  if (operationalStatus != null && !OPERATIONAL_STATUS_VALUES.has(operationalStatus)) {
    throw new Error('Invalid operational status')
  }

  const ctx = await getDashboardTenant()
  if (!ctx) throw new Error('Not authenticated')

  const editDenied = await denyUnlessCanEditDashboardModule('work_orders')
  if (editDenied) throw new Error(editDenied.error)

  const tenantId = ctx.tenant.id
  const assignDenied = await denyUnlessMayMutateWorkOrder(workOrderId, tenantId)
  if (assignDenied) throw new Error(assignDenied.error)

  const adminClient = await createAdminClient()
  const now = new Date().toISOString()

  const { error } = await adminClient
    .from('work_orders')
    .update({
      operational_status: operationalStatus,
      updated_at:         now,
    })
    .eq('id', workOrderId)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[updateWorkOrderOperationalStatus]', error.message)
    throw new Error(`Failed to update operational status: ${error.message}`)
  }
}

// ── startWorkOrder ────────────────────────────────────────────────────────────

/**
 * Transitions a work order from ready → in_progress and records started_at.
 *
 * Guards: only updates if current status is 'ready' — prevents double-starts.
 * Returns the updated timestamp snapshot for the client optimistic state.
 */
export async function startWorkOrder(
  workOrderId: string,
): Promise<WorkOrderTimeSnapshot> {
  const ctx = await getDashboardTenant()
  if (!ctx) throw new Error('Not authenticated')

  const startDenied = await denyUnlessCanEditDashboardModule('work_orders')
  if (startDenied) throw new Error(startDenied.error)

  const tenantId    = ctx.tenant.id
  const startAssignDenied = await denyUnlessMayMutateWorkOrder(workOrderId, tenantId)
  if (startAssignDenied) throw new Error(startAssignDenied.error)

  const adminClient = await createAdminClient()
  const now         = new Date().toISOString()

  const { data, error } = await adminClient
    .from('work_orders')
    .update({
      status:     'in_progress',
      started_at: now,
      updated_at: now,
    })
    .eq('id',        workOrderId)
    .eq('tenant_id', tenantId)
    .eq('status',    'ready')     // guard: only transition from 'ready'
    .select('id, status, started_at, completed_at, actual_hours, updated_at')
    .single()

  if (error) {
    console.error('[startWorkOrder]', error.message)
    throw new Error(`Failed to start work order: ${error.message}`)
  }

  // If data is null the guard prevented the update (WO wasn't in 'ready' state)
  if (!data) {
    throw new Error('Work order could not be started — it may not be in Ready status.')
  }

  return {
    id:           data.id,
    status:       data.status       as WorkOrderStatus,
    started_at:   data.started_at   as string | null,
    completed_at: data.completed_at as string | null,
    actual_hours: null,               // not set until completion
    updated_at:   data.updated_at,
  }
}

// ── completeWorkOrder ─────────────────────────────────────────────────────────

/**
 * Transitions a work order from in_progress → completed.
 *
 * Two-step process:
 *   Step 1 — Fetch started_at from DB (authoritative server timestamp).
 *   Step 2 — Write completed_at, actual_hours, and status in one update.
 *
 * actual_hours is computed server-side from the authoritative started_at,
 * NOT from the client's optimistic state, to guarantee accuracy.
 *
 * Guards: both queries filter on status = 'in_progress' — prevents double-completion.
 * Returns the updated snapshot for the client optimistic state.
 */
export async function completeWorkOrder(
  workOrderId: string,
): Promise<WorkOrderTimeSnapshot> {
  const ctx = await getDashboardTenant()
  if (!ctx) throw new Error('Not authenticated')

  const completeDenied = await denyUnlessCanEditDashboardModule('work_orders')
  if (completeDenied) throw new Error(completeDenied.error)

  const tenantId    = ctx.tenant.id
  const completeAssignDenied = await denyUnlessMayMutateWorkOrder(workOrderId, tenantId)
  if (completeAssignDenied) throw new Error(completeAssignDenied.error)

  const adminClient = await createAdminClient()

  // ── Step 1: Fetch started_at from DB ────────────────────────────────────
  // We intentionally do NOT trust the client's local started_at because
  // it is optimistic and may be a few ms off from the DB value.

  const { data: current, error: fetchError } = await adminClient
    .from('work_orders')
    .select('started_at')
    .eq('id',        workOrderId)
    .eq('tenant_id', tenantId)
    .eq('status',    'in_progress')   // guard: confirm still in_progress
    .single()

  if (fetchError) {
    console.error('[completeWorkOrder] fetch started_at:', fetchError.message)
    throw new Error(`Failed to complete work order: ${fetchError.message}`)
  }

  if (!current) {
    throw new Error('Work order could not be completed — it may not be In Progress.')
  }

  // ── Step 2: Compute actual_hours then write ──────────────────────────────
  const now           = new Date()
  const nowISO        = now.toISOString()
  const startedAtISO  = current.started_at as string | null

  // Round to 2 decimal places (e.g. 1.75 = 1h 45m)
  const actualHours: number | null = startedAtISO
    ? Math.round(((now.getTime() - new Date(startedAtISO).getTime()) / 3_600_000) * 100) / 100
    : null

  const { data, error: updateError } = await adminClient
    .from('work_orders')
    .update({
      status:       'completed',
      completed_at: nowISO,
      actual_hours: actualHours,
      updated_at:   nowISO,
    })
    .eq('id',        workOrderId)
    .eq('tenant_id', tenantId)
    .eq('status',    'in_progress')   // guard again: prevents race condition
    .select('id, status, started_at, completed_at, actual_hours, updated_at')
    .single()

  if (updateError) {
    console.error('[completeWorkOrder] update:', updateError.message)
    throw new Error(`Failed to complete work order: ${updateError.message}`)
  }

  if (!data) {
    throw new Error('Work order completion failed — status may have changed between fetch and update.')
  }

  return {
    id:           data.id,
    status:       data.status       as WorkOrderStatus,
    started_at:   data.started_at   as string | null,
    completed_at: data.completed_at as string | null,
    actual_hours: data.actual_hours as number | null,
    updated_at:   data.updated_at,
  }
}

// ── reopenWorkOrder ───────────────────────────────────────────────────────────

/**
 * Transitions a work order from completed → in_progress.
 *
 * Rules:
 *   - started_at is preserved (original work-start time is kept for history)
 *   - completed_at is cleared to null
 *   - actual_hours is cleared to null (will be recalculated on next completion)
 *
 * Guard: only updates if current status is 'completed' — prevents reopening
 * a WO that is already in_progress or in another state.
 */
export async function reopenWorkOrder(
  workOrderId: string,
): Promise<WorkOrderTimeSnapshot> {
  const ctx = await getDashboardTenant()
  if (!ctx) throw new Error('Not authenticated')

  const reopenWoDenied = await denyUnlessCanEditDashboardModule('work_orders')
  if (reopenWoDenied) throw new Error(reopenWoDenied.error)

  const tenantId    = ctx.tenant.id
  const reopenAssignDenied = await denyUnlessMayMutateWorkOrder(workOrderId, tenantId)
  if (reopenAssignDenied) throw new Error(reopenAssignDenied.error)

  const adminClient = await createAdminClient()
  const now         = new Date().toISOString()

  const { data, error } = await adminClient
    .from('work_orders')
    .update({
      status:       'in_progress',
      completed_at: null,
      actual_hours: null,
      updated_at:   now,
      // started_at intentionally omitted — preserved unchanged
    })
    .eq('id',        workOrderId)
    .eq('tenant_id', tenantId)
    .eq('status',    'completed')   // guard: only transition from 'completed'
    .select('id, status, started_at, completed_at, actual_hours, updated_at')
    .single()

  if (error) {
    console.error('[reopenWorkOrder]', error.message)
    throw new Error(`Failed to reopen work order: ${error.message}`)
  }

  if (!data) {
    throw new Error('Work order could not be reopened — it may not be in Completed status.')
  }

  return {
    id:           data.id,
    status:       data.status       as WorkOrderStatus,
    started_at:   data.started_at   as string | null,
    completed_at: data.completed_at as string | null,
    actual_hours: data.actual_hours as number | null,
    updated_at:   data.updated_at,
  }
}

// ── cancelWorkOrder ───────────────────────────────────────────────────────────

/**
 * Soft-archives (cancels) a work order record.
 *
 * Blocker: work orders with status 'invoiced' cannot be cancelled.
 * Invoiced records are billing artifacts and must be preserved permanently.
 *
 * Label convention:
 *   draft / ready              → "Cancel Work Order" (work never started)
 *   in_progress / completed    → "Archive Work Order" (work was performed)
 * Both map to the same action — the UI label differs, the DB operation is identical.
 *
 * Validation: if reason === 'other', note is required.
 *
 * Returns null on success, { error } on any blocker or failure.
 */
export async function cancelWorkOrder(
  workOrderId: string,
  reason:      string,
  note?:       string,
): Promise<ArchiveResult> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authenticated' }

  const cancelWoDenied = await denyUnlessCanEditDashboardModule('work_orders')
  if (cancelWoDenied) return cancelWoDenied

  const cancelAssignDenied = await denyUnlessMayMutateWorkOrder(workOrderId, ctx.tenant.id)
  if (cancelAssignDenied) return cancelAssignDenied

  // ── Validate reason / note constraint ───────────────────────────────────
  if (!reason?.trim()) {
    return { error: 'A reason is required to cancel a work order.' }
  }
  if (reason === 'other' && !note?.trim()) {
    return { error: 'A note is required when the reason is "Other".' }
  }

  const tenantId    = ctx.tenant.id
  const supabase    = await createClient()
  const adminClient = await createAdminClient()

  // ── Resolve current auth user for audit column ───────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  const archivedBy = user?.id ?? null

  // ── Blocker: fetch current status ────────────────────────────────────────
  // Invoiced work orders cannot be cancelled — billing records must be preserved.
  const { data: current, error: fetchErr } = await adminClient
    .from('work_orders')
    .select('status')
    .eq('id', workOrderId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchErr) {
    console.error('[cancelWorkOrder] fetch status:', fetchErr.message)
    return { error: `Could not load work order: ${fetchErr.message}` }
  }

  if (!current) {
    return { error: 'Work order not found.' }
  }

  if (current.status === 'invoiced') {
    return {
      error: 'Cannot cancel: this work order has been invoiced. Invoiced records cannot be removed.',
    }
  }

  // ── Cancel (archive) the work order ─────────────────────────────────────
  const now = new Date().toISOString()

  const { error: updateErr } = await adminClient
    .from('work_orders')
    .update({
      is_archived:    true,
      archived_at:    now,
      archived_by:    archivedBy,
      archive_reason: reason.trim(),
      archive_note:   note?.trim() || null,
      updated_at:     now,
    })
    .eq('id', workOrderId)
    .eq('tenant_id', tenantId)   // tenant isolation: silently no-ops if mismatch

  if (updateErr) {
    console.error('[cancelWorkOrder] update:', updateErr.message)
    return { error: `Failed to cancel work order: ${updateErr.message}` }
  }

  return null
}

// ── createInvoiceFromWorkOrder ────────────────────────────────────────────

/**
 * Creates an invoice from a work order.
 * Idempotent: if an invoice already exists, returns it without creating a duplicate.
 *
 * Steps:
 *   1. Fetch the work order + items
 *   2. Check if invoice already exists
 *   3. If not, create invoice header + line items
 *   4. Update work order with invoice_id
 *   5. Return the created/existing invoice
 */
export async function createInvoiceFromWorkOrder(
  workOrderId: string,
): Promise<{ id: string; invoice_number: string | null }> {
  const ctx = await getDashboardTenant()
  if (!ctx) throw new Error('Not authenticated')

  const invFromWoDenied = await denyUnlessCanEditAllDashboardModules(['invoices', 'work_orders'])
  if (invFromWoDenied) throw new Error(invFromWoDenied.error)

  const tenantId    = ctx.tenant.id
  const invAssignDenied = await denyUnlessMayMutateWorkOrder(workOrderId, tenantId)
  if (invAssignDenied) throw new Error(invAssignDenied.error)

  const supabase    = await createAdminClient()

  console.log('═══════════════════════════════════════════════════════════')
  console.log('[createInvoiceFromWorkOrder] START', { workOrderId, tenantId })

  // 1. Fetch work order + items
  const { data: woData, error: woError } = await supabase
    .from('work_orders')
    .select('*')
    .eq('id', workOrderId)
    .eq('tenant_id', tenantId)
    .single()

  if (woError || !woData) {
    console.error('[createInvoiceFromWorkOrder] fetch work order:', woError?.message)
    throw new Error('Work order not found')
  }

  const { data: woItems, error: itemsError } = await supabase
    .from('work_order_items')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('work_order_id', workOrderId)
    .order('display_order', { ascending: true })

  if (itemsError) {
    console.error('[createInvoiceFromWorkOrder] FETCH ITEMS ERROR:', itemsError.message)
    throw new Error('Failed to fetch work order items')
  }

  const items = woItems ?? []
  const woItemCount = items.length

  console.log('[createInvoiceFromWorkOrder] FETCHED work_order_items:', {
    workOrderId,
    itemCount: woItemCount,
  })

  if (woItemCount > 0) {
    console.log('[createInvoiceFromWorkOrder] First work order item:', items[0])
  } else {
    console.log('[createInvoiceFromWorkOrder] ⚠️ WARNING: No work_order_items found')
  }

  // 2. Check if invoice already exists
  const { data: existingInvoice, error: existingInvoiceError } = await supabase
    .from('invoices')
    .select('id, invoice_number')
    .eq('work_order_id', workOrderId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (existingInvoiceError) {
    console.error('[createInvoiceFromWorkOrder] fetch existing invoice:', existingInvoiceError.message)
    throw new Error(`Failed to check existing invoice: ${existingInvoiceError.message}`)
  }

  if (existingInvoice) {
    console.log('[createInvoiceFromWorkOrder] Existing invoice found:', existingInvoice)

    const { data: existingInvoiceItems, error: existingItemsError } = await supabase
      .from('invoice_items')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('invoice_id', existingInvoice.id)

    if (existingItemsError) {
      console.error('[createInvoiceFromWorkOrder] check existing invoice items:', existingItemsError.message)
      throw new Error(`Failed to check existing invoice items: ${existingItemsError.message}`)
    }

    const existingItemCount = existingInvoiceItems?.length ?? 0

    console.log('[createInvoiceFromWorkOrder] Existing invoice item count:', {
      invoiceId: existingInvoice.id,
      existingItemCount,
    })

    if (existingItemCount > 0) {
      console.log('[createInvoiceFromWorkOrder] Existing invoice already has items, returning as-is')
      console.log('═══════════════════════════════════════════════════════════')
      return {
        id: existingInvoice.id,
        invoice_number: existingInvoice.invoice_number,
      }
    }

    console.log('[createInvoiceFromWorkOrder] Existing invoice has NO items, backfilling from work_order_items')

    if (items.length > 0) {
      const backfillInvoiceItems = items.map(item => ({
        tenant_id: tenantId,
        invoice_id: existingInvoice.id,
        source_work_order_item_id: item.id,
        title: item.title,
        description: item.description,
        category: item.category ?? 'misc',
        quantity: 1,
        labor: item.labor_total,
        parts: item.parts_total,
        total: item.line_total,
        labor_hours: item.labor_hours,
        labor_rate: item.labor_rate,
        labor_total: item.labor_total,
        parts_total: item.parts_total,
        line_total: Math.round((item.labor_total + item.parts_total) * 100) / 100,
        display_order: item.display_order,
        source_reference: null,
        notes: null,
      }))

      const { error: backfillError, data: backfillData } = await supabase
        .from('invoice_items')
        .insert(backfillInvoiceItems)
        .select('*')

      if (backfillError) {
        console.error('[createInvoiceFromWorkOrder] backfill invoice items error:', backfillError)
        throw new Error(`Failed to backfill invoice items: ${backfillError.message}`)
      }

      console.log('[createInvoiceFromWorkOrder] Backfill complete:', {
        insertedRowCount: backfillData?.length ?? 0,
      })
    } else {
      console.warn('[createInvoiceFromWorkOrder] Cannot backfill existing invoice because work_order_items is empty')
    }

    console.log('═══════════════════════════════════════════════════════════')
    return {
      id: existingInvoice.id,
      invoice_number: existingInvoice.invoice_number,
    }
  }

  // 3. Generate invoice number (simple sequence per tenant)
  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  const invoiceNumber = `INV-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(4, '0')}`

  // Calculate subtotals from work order items
  // TAX RULE: Tax applies ONLY to parts, NOT to labor
  let subtotalLabor = 0
  let subtotalParts = 0

  items.forEach(item => {
    subtotalLabor += item.labor_total || 0
    subtotalParts += item.parts_total || 0
  })

  const subtotal = subtotalLabor + subtotalParts
  // Tax is calculated ONLY on parts (not labor)
  const taxableAmount = subtotalParts
  const taxAmount = Math.round(taxableAmount * (woData.tax_rate ?? 0) * 100) / 100
  const total = subtotal + taxAmount

  // 4. Create invoice header
  const { data: invoiceData, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      tenant_id: tenantId,
      work_order_id: workOrderId,
      customer_id: woData.customer_id,
      vehicle_id: woData.vehicle_id,
      invoice_number: invoiceNumber,
      status: 'draft',
      subtotal_labor: subtotalLabor,
      subtotal_parts: subtotalParts,
      subtotal,
      tax_rate: woData.tax_rate,
      tax_amount: taxAmount,
      total,
    })
    .select()
    .single()

  if (invoiceError || !invoiceData) {
    console.error('[createInvoiceFromWorkOrder] create invoice:', invoiceError?.message)
    throw new Error('Failed to create invoice')
  }

  // Create invoice items from work order items
  const itemsLength = items.length
  console.log('[createInvoiceFromWorkOrder] ABOUT TO INSERT:', {
    itemsLength,
    invoiceId: invoiceData.id,
  })

  if (itemsLength > 0) {
    const invoiceItems = items.map(item => ({
      tenant_id: tenantId,
      invoice_id: invoiceData.id,
      source_work_order_item_id: item.id,
      title: item.title,
      description: item.description,
      category: item.category ?? 'misc',
      quantity: 1,
      labor: item.labor_total,
      parts: item.parts_total,
      total: item.line_total,
      labor_hours: item.labor_hours,
      labor_rate: item.labor_rate,
      labor_total: item.labor_total,
      parts_total: item.parts_total,
      line_total: Math.round((item.labor_total + item.parts_total) * 100) / 100,
      display_order: item.display_order,
      source_reference: null,
      notes: null,
    }))

    const payloadLength = invoiceItems.length
    console.log('[createInvoiceFromWorkOrder] PAYLOAD READY:', {
      payloadLength,
      firstItemTitle: invoiceItems[0]?.title,
      firstItemCategory: invoiceItems[0]?.category,
    })

    const { error: itemsInsertError, data: itemsInsertData } = await supabase
      .from('invoice_items')
      .insert(invoiceItems)
      .select()

    const insertedRowCount = itemsInsertData?.length ?? 0
    console.log('[createInvoiceFromWorkOrder] INSERT RESULT:', {
      payloadLength,
      insertedRowCount,
      insertError: itemsInsertError?.message ?? 'none',
    })

    if (itemsInsertError) {
      console.error('  ❌ INSERT FAILED:', itemsInsertError)
      throw new Error('Failed to create invoice items: ' + itemsInsertError.message)
    }

    if (insertedRowCount === 0) {
      console.warn('  ⚠️  WARNING: Insert succeeded but NO rows returned!')
    } else {
      console.log('  ✅ Inserted', insertedRowCount, 'rows')
    }
  } else {
    console.log('[createInvoiceFromWorkOrder] ⚠️  NO ITEMS TO INSERT: items.length = 0')
  }

  // 5. Update work order status to 'invoiced'
  // NOTE: invoices.work_order_id is the source of truth for the invoice relationship.
  // We do NOT use work_orders.invoice_id (back-reference) as it is not needed and
  // allows for potential multiple invoices per work order in the future.
  const { error: statusError } = await supabase
    .from('work_orders')
    .update({
      status: 'invoiced',
      updated_at: new Date().toISOString(),
    })
    .eq('id', workOrderId)
    .eq('tenant_id', tenantId)

  if (statusError) {
    console.error('[createInvoiceFromWorkOrder] update work order status:', statusError.message)
    // Note: Invoice and items were already created successfully, so we log this but continue
    console.warn('[createInvoiceFromWorkOrder] ⚠️  Status update failed but invoice was created:', {
      invoiceId: invoiceData.id,
      statusError: statusError.message,
    })
  } else {
    console.log('[createInvoiceFromWorkOrder] ✅ Work order status updated to invoiced')
  }

  console.log('[createInvoiceFromWorkOrder] ✅ COMPLETE:', {
    invoiceId: invoiceData.id,
    invoiceNumber: invoiceData.invoice_number,
    workOrderId,
  })
  console.log('═══════════════════════════════════════════════════════════')

  return {
    id: invoiceData.id,
    invoice_number: invoiceData.invoice_number,
  }
}

// ── recalculateInvoiceTotals ──────────────────────────────────────────────────
//
// Recalculates and updates invoice totals based on current invoice_items.
// This ensures correct totals even if items were manually edited or migrated.
//
// Calculation rules:
//   subtotal_labor = SUM(invoice_items.labor_total)
//   subtotal_parts = SUM(invoice_items.parts_total)
//   subtotal = subtotal_labor + subtotal_parts
//   tax_amount = subtotal_parts * tax_rate (tax applies ONLY to parts)
//   total = subtotal + tax_amount
//

export async function recalculateInvoiceTotals(invoiceId: string): Promise<void> {
  const ctx = await getDashboardTenant()
  if (!ctx) throw new Error('Not authenticated')

  const recalcInvDenied = await denyUnlessCanEditDashboardModule('invoices')
  if (recalcInvDenied) throw new Error(recalcInvDenied.error)

  const tenantId    = ctx.tenant.id
  const supabase    = await createAdminClient()

  console.log('[recalculateInvoiceTotals] START:', { invoiceId, tenantId })

  // 1. Fetch invoice header to get tax_rate
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id, tax_rate')
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .single()

  if (invoiceError || !invoice) {
    console.error('[recalculateInvoiceTotals] fetch invoice:', invoiceError?.message)
    throw new Error('Invoice not found')
  }

  // 2. Fetch all invoice items
  const { data: items, error: itemsError } = await supabase
    .from('invoice_items')
    .select('labor_total, parts_total')
    .eq('invoice_id', invoiceId)
    .eq('tenant_id', tenantId)

  if (itemsError) {
    console.error('[recalculateInvoiceTotals] fetch items:', itemsError.message)
    throw new Error('Failed to fetch invoice items')
  }

  // 3. Calculate totals
  const invoiceItems = items ?? []
  let subtotalLabor = 0
  let subtotalParts = 0

  invoiceItems.forEach(item => {
    subtotalLabor += item.labor_total || 0
    subtotalParts += item.parts_total || 0
  })

  const subtotal = subtotalLabor + subtotalParts
  const taxableAmount = subtotalParts
  const taxAmount = Math.round(taxableAmount * (invoice.tax_rate ?? 0) * 100) / 100
  const total = subtotal + taxAmount

  console.log('[recalculateInvoiceTotals] Calculated:', {
    subtotalLabor,
    subtotalParts,
    subtotal,
    taxRate: invoice.tax_rate,
    taxAmount,
    total,
  })

  // 4. Update invoice with recalculated totals
  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      subtotal_labor: subtotalLabor,
      subtotal_parts: subtotalParts,
      subtotal,
      tax_amount: taxAmount,
      total,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)

  if (updateError) {
    console.error('[recalculateInvoiceTotals] update invoice:', updateError.message)
    throw new Error('Failed to update invoice totals')
  }

  console.log('[recalculateInvoiceTotals] ✅ COMPLETE')
}

// ── fixInvoiceItemLineTotals ──────────────────────────────────────────────────
//
// Fixes invoice item line_totals for a specific invoice.
// If any invoice_items have incorrect line_total (missing parts_total),
// recalculates them as: line_total = labor_total + parts_total
//
// Use this to fix existing invoices that were created with the bug.
//

export async function fixInvoiceItemLineTotals(invoiceId: string): Promise<{ fixed: number }> {
  const ctx = await getDashboardTenant()
  if (!ctx) throw new Error('Not authenticated')

  const fixLinesDenied = await denyUnlessCanEditDashboardModule('invoices')
  if (fixLinesDenied) throw new Error(fixLinesDenied.error)

  const tenantId    = ctx.tenant.id
  const supabase    = await createAdminClient()

  console.log('[fixInvoiceItemLineTotals] START:', { invoiceId, tenantId })

  // 1. Fetch all invoice items
  const { data: items, error: itemsError } = await supabase
    .from('invoice_items')
    .select('id, labor_total, parts_total, line_total')
    .eq('invoice_id', invoiceId)
    .eq('tenant_id', tenantId)

  if (itemsError) {
    console.error('[fixInvoiceItemLineTotals] fetch items:', itemsError.message)
    throw new Error('Failed to fetch invoice items')
  }

  const invoiceItems = items ?? []
  let fixedCount = 0

  // 2. Identify items that need fixing
  const updatesToApply: Array<{ id: string; correctLineTotal: number }> = []

  invoiceItems.forEach(item => {
    const expectedLineTotal = Math.round((item.labor_total + item.parts_total) * 100) / 100
    if (Math.abs(item.line_total - expectedLineTotal) > 0.01) {
      // Line total is wrong, needs fixing
      updatesToApply.push({
        id: item.id,
        correctLineTotal: expectedLineTotal,
      })
      fixedCount++
    }
  })

  console.log('[fixInvoiceItemLineTotals] Found', fixedCount, 'items to fix')

  // 3. Apply updates (if any)
  if (fixedCount > 0) {
    for (const update of updatesToApply) {
      const { error } = await supabase
        .from('invoice_items')
        .update({
          line_total: update.correctLineTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', update.id)
        .eq('tenant_id', tenantId)

      if (error) {
        console.error('[fixInvoiceItemLineTotals] update item:', error.message)
        throw new Error(`Failed to fix invoice item ${update.id}: ${error.message}`)
      }
    }
  }

  console.log('[fixInvoiceItemLineTotals] ✅ COMPLETE:', { fixedCount })
  return { fixed: fixedCount }
}

// ── validateInvoiceTotals ─────────────────────────────────────────────────────
//
// Validates that an invoice's totals are correct based on its items.
// Returns validation result with details about any discrepancies.
//

export async function validateInvoiceTotals(
  invoiceId: string,
): Promise<{
  isValid: boolean
  details: {
    expectedSubtotalLabor: number
    actualSubtotalLabor: number
    expectedSubtotalParts: number
    actualSubtotalParts: number
    expectedSubtotal: number
    actualSubtotal: number
    expectedTaxAmount: number
    actualTaxAmount: number
    expectedTotal: number
    actualTotal: number
    itemsWithBadLineTotal: number
  }
}> {
  const ctx = await getDashboardTenant()
  if (!ctx) throw new Error('Not authenticated')

  const tenantId = ctx.tenant.id
  const supabase = await createAdminClient()

  // 1. Fetch invoice header
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id, subtotal_labor, subtotal_parts, subtotal, tax_rate, tax_amount, total')
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .single()

  if (invoiceError || !invoice) {
    throw new Error('Invoice not found')
  }

  // 2. Fetch all invoice items
  const { data: items, error: itemsError } = await supabase
    .from('invoice_items')
    .select('labor_total, parts_total, line_total')
    .eq('invoice_id', invoiceId)
    .eq('tenant_id', tenantId)

  if (itemsError) {
    throw new Error('Failed to fetch invoice items')
  }

  // 3. Calculate expected values
  const invoiceItems = items ?? []
  let expectedSubtotalLabor = 0
  let expectedSubtotalParts = 0
  let itemsWithBadLineTotal = 0

  invoiceItems.forEach(item => {
    expectedSubtotalLabor += item.labor_total || 0
    expectedSubtotalParts += item.parts_total || 0

    const expectedLineTotal = Math.round((item.labor_total + item.parts_total) * 100) / 100
    if (Math.abs(item.line_total - expectedLineTotal) > 0.01) {
      itemsWithBadLineTotal++
    }
  })

  const expectedSubtotal = expectedSubtotalLabor + expectedSubtotalParts
  const expectedTaxAmount = Math.round(expectedSubtotalParts * (invoice.tax_rate ?? 0) * 100) / 100
  const expectedTotal = expectedSubtotal + expectedTaxAmount

  // 4. Compare and return validation result
  const isValid =
    Math.abs(invoice.subtotal_labor - expectedSubtotalLabor) < 0.01 &&
    Math.abs(invoice.subtotal_parts - expectedSubtotalParts) < 0.01 &&
    Math.abs(invoice.subtotal - expectedSubtotal) < 0.01 &&
    Math.abs(invoice.tax_amount - expectedTaxAmount) < 0.01 &&
    Math.abs(invoice.total - expectedTotal) < 0.01 &&
    itemsWithBadLineTotal === 0

  return {
    isValid,
    details: {
      expectedSubtotalLabor,
      actualSubtotalLabor: invoice.subtotal_labor,
      expectedSubtotalParts,
      actualSubtotalParts: invoice.subtotal_parts,
      expectedSubtotal,
      actualSubtotal: invoice.subtotal,
      expectedTaxAmount,
      actualTaxAmount: invoice.tax_amount,
      expectedTotal,
      actualTotal: invoice.total,
      itemsWithBadLineTotal,
    },
  }
}

// ── Assign technician (advisor / admin only) ─────────────────────────────────

export async function setWorkOrderTechnician(
  workOrderId:            string,
  technicianTenantUserId: string | null,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const du = await getCurrentDashboardTenantUser()
  if (!du || !canAssignOperationalTechnician(du.role)) {
    return { error: 'Not authorized' }
  }

  const tenantId    = ctx.tenant.id
  const adminClient = await createAdminClient()

  if (technicianTenantUserId) {
    const { data: assignee } = await adminClient
      .from('tenant_users')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', technicianTenantUserId)
      .maybeSingle()

    if (!assignee) return { error: 'Invalid team member.' }
  }

  const { error } = await adminClient
    .from('work_orders')
    .update({
      technician_id: technicianTenantUserId,
      updated_at:      new Date().toISOString(),
    })
    .eq('id', workOrderId)
    .eq('tenant_id', tenantId)

  if (error) return { error: error.message }

  if (technicianTenantUserId) {
    await ensurePrimaryTechnicianAssignmentForWorkOrder(
      adminClient,
      tenantId,
      workOrderId,
      technicianTenantUserId,
    )
  }

  return null
}

/** Technician: claim an unassigned work order (does not change advisor assignment rules). */
export async function claimWorkOrderForCurrentTechnician(
  workOrderId: string,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const du = await getCurrentDashboardTenantUser()
  if (!du || du.role !== 'technician') return { error: 'Not authorized' }

  const tenantId    = ctx.tenant.id
  const adminClient = await createAdminClient()
  const now         = new Date().toISOString()

  const { data, error } = await adminClient
    .from('work_orders')
    .update({ technician_id: du.tenantUserId, updated_at: now })
    .eq('id', workOrderId)
    .eq('tenant_id', tenantId)
    .is('technician_id', null)
    .select('id')
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Already assigned or not found. Refresh the page.' }

  await ensurePrimaryTechnicianAssignmentForWorkOrder(
    adminClient,
    tenantId,
    workOrderId,
    du.tenantUserId,
  )

  return null
}
