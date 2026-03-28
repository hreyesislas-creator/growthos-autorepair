'use server'

import { getDashboardTenant } from '@/lib/tenant'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { WorkOrderStatus } from '@/lib/types'
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

  const tenantId    = ctx.tenant.id
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

  const tenantId    = ctx.tenant.id
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

  const tenantId    = ctx.tenant.id
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

  const tenantId    = ctx.tenant.id
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

  // ── Validate reason / note constraint ───────────────────────────────────
  if (!reason?.trim()) {
    return { error: 'A reason is required to cancel a work order.' }
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

  const tenantId    = ctx.tenant.id
  const supabase    = await createAdminClient()

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
    .eq('work_order_id', workOrderId)
    .order('display_order', { ascending: true })

  if (itemsError) {
    console.error('[createInvoiceFromWorkOrder] fetch items:', itemsError.message)
    throw new Error('Failed to fetch work order items')
  }

  // 2. Check if invoice already exists
  const { data: existingInvoice } = await supabase
    .from('invoices')
    .select('id, invoice_number')
    .eq('work_order_id', workOrderId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (existingInvoice) {
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
  let subtotalLabor = 0
  let subtotalParts = 0
  let subtotalOther = 0

  const items = woItems ?? []
  items.forEach(item => {
    if (item.category === 'labor') {
      subtotalLabor += item.labor_total
    } else if (item.category === 'part') {
      subtotalParts += item.parts_total
    } else {
      subtotalOther += item.line_total
    }
  })

  const subtotal = subtotalLabor + subtotalParts + subtotalOther
  const taxAmount = subtotal * (woData.tax_rate ?? 0)
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
      subtotal_other: subtotalOther,
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
  if (items.length > 0) {
    const invoiceItems = items.map(item => ({
      tenant_id: tenantId,
      invoice_id: invoiceData.id,
      work_order_item_id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      labor_hours: item.labor_hours,
      labor_rate: item.labor_rate,
      labor_total: item.labor_total,
      parts_total: item.parts_total,
      line_total: item.line_total,
      display_order: item.display_order,
    }))

    const { error: itemsInsertError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems)

    if (itemsInsertError) {
      console.error('[createInvoiceFromWorkOrder] insert items:', itemsInsertError.message)
      throw new Error('Failed to create invoice items')
    }
  }

  // 5. Update work order with invoice_id and status
  const { error: updateError } = await supabase
    .from('work_orders')
    .update({
      invoice_id: invoiceData.id,
      status: 'invoiced',
      updated_at: new Date().toISOString(),
    })
    .eq('id', workOrderId)
    .eq('tenant_id', tenantId)

  if (updateError) {
    console.error('[createInvoiceFromWorkOrder] update work order:', updateError.message)
    throw new Error('Failed to link invoice to work order')
  }

  return {
    id: invoiceData.id,
    invoice_number: invoiceData.invoice_number,
  }
}
