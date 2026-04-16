'use server'

/**
 * Server actions for the advisor-facing Customer Presentation screen.
 *
 * sendEstimateByText — sends the public estimate link to the customer's phone.
 *
 * approveEstimateItem  — persists an 'approved' decision for one line item.
 * declineEstimateItem  — persists a 'declined' decision for one line item.
 * undecideEstimateItem — removes a persisted decision (item returns to pending).
 *
 * Architecture notes for item-decision actions:
 *   • Uses createAdminClient to match the existing pattern in this file and
 *     avoid any RLS edge-cases. Auth is validated via getDashboardTenant().
 *   • approve/decline use an upsert ON CONFLICT (estimate_item_id) so calling
 *     twice is idempotent and changing a decision is a single round-trip.
 *   • undecide DELETEs the row — absence of a row is the canonical "pending" state.
 *   • Each action validates that the item belongs to the estimate + tenant before
 *     writing, so an attacker with a valid session cannot modify another tenant's data.
 */

import {
  denyUnlessCanEditAllDashboardModules,
  denyUnlessCanEditDashboardModule,
} from '@/lib/auth/roles'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardTenant }  from '@/lib/tenant'

// ── Result type ───────────────────────────────────────────────────────────────

export interface SendTextResult {
  success?:  true
  noPhone?:  true          // customer has no phone on file
  notWired?: true          // Twilio env vars not set — dev mode
  error?:    string
}

// ── Action ────────────────────────────────────────────────────────────────────

export async function sendEstimateByText(
  estimateId: string,
): Promise<SendTextResult> {
  // Must be called from an authenticated dashboard session
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authenticated.' }

  const supabase = createAdminClient()

  // ── 1. Load estimate header ─────────────────────────────────────────────────
  const { data: estimate, error: estErr } = await supabase
    .from('estimates')
    .select('id, customer_id, estimate_number, tenant_id, inspection_id')
    .eq('id', estimateId)
    .maybeSingle()

  if (estErr || !estimate) return { error: 'Estimate not found.' }

  // ── 2. Load customer phone + first name ─────────────────────────────────────
  const { data: customer } = estimate.customer_id
    ? await supabase
        .from('customers')
        .select('first_name, phone')
        .eq('id', estimate.customer_id)
        .single()
    : { data: null }

  if (!customer?.phone?.trim()) return { noPhone: true }

  // ── 3. Load shop name ───────────────────────────────────────────────────────
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', estimate.tenant_id)
    .single()

  const shopName  = tenant?.name   ?? 'Your Auto Shop'
  const firstName = customer.first_name?.trim() || 'there'

  // ── 4. Build the correct customer-facing URL ────────────────────────────────
  // PRODUCT RULE: when the estimate is linked to an inspection, the customer
  // entry point is the inspection page (/i/…), not the estimate page (/e/…).
  // This matches the routing logic in EstimateEditor.tsx customerUrl().
  const rawBase = process.env.NEXT_PUBLIC_BASE_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    ?? 'https://your-shop.app'

  const baseUrl   = rawBase.replace(/\/$/, '')
  const inspectionId = (estimate as any).inspection_id as string | null
  const publicUrl = inspectionId
    ? `${baseUrl}/i/${inspectionId}`
    : `${baseUrl}/e/${estimateId}`

  // ── 5. Compose SMS message — wording reflects which page the customer sees ──
  const message = inspectionId
    ? `Hi ${firstName}, your vehicle inspection and repair estimate from ${shopName} is ready: ${publicUrl}. Review the findings and approve your repairs here.`
    : `Hi ${firstName}, here is your repair estimate from ${shopName}: ${publicUrl}. You can review and approve your recommended work here.`

  // Normalize phone number — keep leading + and digits only.
  const toNumber = customer.phone.replace(/[^\d+]/g, '')

  // ── 6. Twilio attempt (if configured) — status decided BEFORE any return ─────
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_FROM_NUMBER

  let deliveryStatus: 'pending' | 'sent' | 'failed' = 'pending'
  let twilioUserMessage: string | null = null
  let providerMessageId: string | null = null

  if (!accountSid || !authToken || !fromNumber) {
    deliveryStatus = 'pending'
  } else {
    const formBody = new URLSearchParams({
      To:   toNumber,
      From: fromNumber,
      Body: message,
    })

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method:  'POST',
        headers: {
          Authorization:  'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody.toString(),
      },
    )

    if (!twilioRes.ok) {
      const json = await twilioRes.json().catch(() => ({})) as { message?: string }
      deliveryStatus = 'failed'
      twilioUserMessage = json.message ?? 'SMS delivery failed. Please try again.'
      console.error('[sendEstimateByText] Twilio error:', json)
    } else {
      deliveryStatus = 'sent'
      const okJson = await twilioRes.json().catch(() => ({})) as { sid?: string }
      providerMessageId = okJson.sid ?? null
    }
  }

  // ── 7. message_logs — production columns (message_body, to_phone, delivery_status)
  const { error: logErr } = await supabase.from('message_logs').insert({
    tenant_id:           estimate.tenant_id,
    customer_id:         estimate.customer_id ?? null,
    channel:             'sms',
    message_body:        message,
    to_phone:            toNumber,
    from_phone:          fromNumber?.trim() ? fromNumber : null,
    delivery_status:     deliveryStatus,
    direction:           'outbound',
    provider_message_id: providerMessageId,
    template_id:         null,
    appointment_id:      null,
    sent_by_user_id:     null,
  })
  if (logErr) {
    console.error('[sendEstimateByText] message_logs insert FAILED:', logErr.message, logErr)
    console.log('[sendEstimateByText] message_logs NOT persisted; delivery_status would have been:', deliveryStatus)
  } else {
    console.log('[sendEstimateByText] message_logs insert OK, delivery_status:', deliveryStatus)
  }

  // ── 8. Return — only after insert attempt ───────────────────────────────────
  if (!accountSid || !authToken || !fromNumber) {
    return { success: true, notWired: true }
  }
  if (twilioUserMessage) {
    return { error: twilioUserMessage }
  }
  return { success: true }
}

// ── Per-job advisor decision actions ──────────────────────────────────────────
//
// Phase 1A scope: persist and remove decisions only.
// No work order creation, no estimate status changes, no public route changes.
//
// decided_by is NULL in every write below.  This is intentional: Phase 1A is
// NOT a real audit trail.  Wiring auth.uid() is deferred to a later phase.
// Do not treat decided_by as trustworthy until that work is complete.
//
// Upsert conflict target: 'estimate_id,estimate_item_id' — matches the
// UNIQUE INDEX idx_item_decisions_unique defined in migration 20240005.

/**
 * Persists an 'approved' decision for a single estimate line item.
 * Idempotent — upsert means calling twice is a no-op.
 * Changing from 'declined' → 'approved' is also a single round-trip.
 */
export async function approveEstimateItem(
  estimateId: string,
  itemId:     string,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authenticated.' }

  const approveDenied = await denyUnlessCanEditDashboardModule('estimates')
  if (approveDenied) return approveDenied

  const supabase = createAdminClient()
  const tenantId = ctx.tenant.id
  const now      = new Date().toISOString()

  // Validate item belongs to this estimate and tenant before writing.
  const { data: item } = await supabase
    .from('estimate_items')
    .select('id')
    .eq('id', itemId)
    .eq('estimate_id', estimateId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!item) return { error: 'Item not found.' }

  const { error } = await supabase
    .from('estimate_item_decisions')
    .upsert(
      {
        tenant_id:        tenantId,
        estimate_id:      estimateId,
        estimate_item_id: itemId,
        decision:         'approved',
        decided_by:       null,   // Phase 1A: not a real audit trail
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
 * Persists a 'declined' decision for a single estimate line item.
 * Idempotent — upsert means calling twice is a no-op.
 * Changing from 'approved' → 'declined' is also a single round-trip.
 */
export async function declineEstimateItem(
  estimateId: string,
  itemId:     string,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authenticated.' }

  const declineDenied = await denyUnlessCanEditDashboardModule('estimates')
  if (declineDenied) return declineDenied

  const supabase = createAdminClient()
  const tenantId = ctx.tenant.id
  const now      = new Date().toISOString()

  const { data: item } = await supabase
    .from('estimate_items')
    .select('id')
    .eq('id', itemId)
    .eq('estimate_id', estimateId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!item) return { error: 'Item not found.' }

  const { error } = await supabase
    .from('estimate_item_decisions')
    .upsert(
      {
        tenant_id:        tenantId,
        estimate_id:      estimateId,
        estimate_item_id: itemId,
        decision:         'declined',
        decided_by:       null,   // Phase 1A: not a real audit trail
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
 * Removes a persisted decision, returning the item to pending.
 * Absence of a row is the canonical pending state — no row is inserted here.
 * If no decision row existed, the DELETE is a silent no-op.
 */
export async function undecideEstimateItem(
  estimateId: string,
  itemId:     string,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authenticated.' }

  const undecideDenied = await denyUnlessCanEditDashboardModule('estimates')
  if (undecideDenied) return undecideDenied

  const supabase = createAdminClient()
  const tenantId = ctx.tenant.id

  const { error } = await supabase
    .from('estimate_item_decisions')
    .delete()
    .eq('estimate_id', estimateId)
    .eq('estimate_item_id', itemId)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[undecideEstimateItem]', error.message)
    return { error: error.message }
  }

  return null
}

// ── Work Order creation from approved items ────────────────────────────────
//
// Called when advisor clicks "Send Approved to Work Order" button.
// Creates a new work order with only the approved line items.

/**
 * Creates a work order from approved estimate items.
 *
 * Flow:
 *   1. Load estimate header for tenant_id, customer_id, vehicle_id
 *   2. Fetch all approved decisions from estimate_item_decisions
 *   3. Load the corresponding estimate_items
 *   4. Create work_orders row
 *   5. Create work_order_items rows (one per approved item)
 *   6. Return the new work_orders.id for redirect
 *
 * Returns { data: { workOrderId } } on success, { error } on failure.
 */
export async function createWorkOrderFromApprovedItems(
  estimateId: string,
): Promise<{ data: { workOrderId: string } } | { error: string }> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authenticated.' }

  const woApprovedDenied = await denyUnlessCanEditDashboardModule('work_orders')
  if (woApprovedDenied) return woApprovedDenied

  const supabase = createAdminClient()
  const tenantId = ctx.tenant.id

  console.log('[createWorkOrderFromApprovedItems] start', {
    tenantId,
    estimateId,
  })

  // ── Step 1: Load estimate header ────────────────────────────────────────
  const { data: estimate, error: estErr } = await supabase
    .from('estimates')
    .select('id, tenant_id, customer_id, vehicle_id, inspection_id, estimate_number, subtotal, tax_rate, tax_amount, total, parts_markup_percent')
    .eq('id', estimateId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (estErr || !estimate) {
    console.error('[createWorkOrderFromApprovedItems] estimate not found', estErr?.message)
    return { error: 'Estimate not found.' }
  }

  console.log('[createWorkOrderFromApprovedItems] estimate loaded', {
    estimateId: estimate.id,
    estimateNumber: estimate.estimate_number,
  })

  // ── Step 2: Fetch approved decisions for this estimate ───────────────────
  const { data: decisions, error: decisErr } = await supabase
    .from('estimate_item_decisions')
    .select('estimate_item_id')
    .eq('estimate_id', estimateId)
    .eq('tenant_id', tenantId)
    .eq('decision', 'approved')

  if (decisErr) {
    console.error('[createWorkOrderFromApprovedItems] fetch decisions failed:', decisErr.message)
    return { error: decisErr.message }
  }

  const approvedItemIds = (decisions ?? []).map(d => d.estimate_item_id)

  if (approvedItemIds.length === 0) {
    console.error('[createWorkOrderFromApprovedItems] no approved items')
    return { error: 'No approved items selected. Please approve at least one job.' }
  }

  console.log('[createWorkOrderFromApprovedItems] approved items found', {
    count: approvedItemIds.length,
  })

  // ── Step 3: Load the approved estimate_items ───────────────────────────
  const { data: approvedItems, error: itemsErr } = await supabase
    .from('estimate_items')
    .select('*')
    .eq('estimate_id', estimateId)
    .in('id', approvedItemIds)

  if (itemsErr) {
    console.error('[createWorkOrderFromApprovedItems] fetch items failed:', itemsErr.message)
    return { error: itemsErr.message }
  }

  const items = approvedItems ?? []
  if (items.length === 0) {
    return { error: 'Failed to load approved items.' }
  }

  console.log('[createWorkOrderFromApprovedItems] approved items loaded', {
    count: items.length,
  })

  // ── Step 4: Generate work order number ──────────────────────────────────
  // Format: WO-YYYY-NNNN (similar to estimates)
  const { count: woCount } = await supabase
    .from('work_orders')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  const year = new Date().getFullYear()
  const seq = (woCount ?? 0) + 1
  const workOrderNumber = `WO-${year}-${String(seq).padStart(4, '0')}`

  // ── Step 5: Create work_orders row ────────────────────────────────────────
  const now = new Date().toISOString()
  const { data: wo, error: woErr } = await supabase
    .from('work_orders')
    .insert({
      tenant_id:           tenantId,
      estimate_id:         estimateId,
      inspection_id:       estimate.inspection_id ?? null,
      customer_id:         estimate.customer_id ?? null,
      vehicle_id:          estimate.vehicle_id ?? null,
      work_order_number:   workOrderNumber,
      estimate_number:     estimate.estimate_number,  // soft copy for traceability
      creation_mode:       'from_estimate',
      status:              'draft',  // Valid statuses: draft, ready, in_progress, completed, invoiced
      subtotal:            Number(estimate.subtotal) || 0,
      tax_rate:            estimate.tax_rate ?? null,
      tax_amount:          Number(estimate.tax_amount) || 0,
      total:               Number(estimate.total) || 0,
      parts_markup_percent: estimate.parts_markup_percent ?? null,
      created_at:          now,
      updated_at:          now,
    })
    .select('id')
    .single()

  if (woErr || !wo) {
    console.error('[createWorkOrderFromApprovedItems] create work_order failed:', woErr?.message)
    return { error: 'Failed to create work order.' }
  }

  const workOrderId = wo.id

  console.log('[createWorkOrderFromApprovedItems] work order created', {
    workOrderId,
    workOrderNumber,
  })

  // ── Step 6: Create work_order_items rows ───────────────────────────────
  // Note: work_order_items schema does NOT have quantity/unit_price columns.
  // It only has labor_total, parts_total, and line_total for pricing.
  const woItems = items.map((item, idx) => ({
    tenant_id:               tenantId,
    work_order_id:           workOrderId,
    estimate_item_id:        item.id,
    service_job_id:          item.service_job_id ?? null,
    title:                   item.title,
    description:             item.description ?? null,
    category:                item.category,
    labor_hours:             item.labor_hours ?? null,
    labor_rate:              item.labor_rate ?? null,
    labor_total:             item.labor_total || 0,
    parts_total:             item.parts_total || 0,
    line_total:              item.line_total,
    inspection_item_id:      item.inspection_item_id ?? null,
    service_recommendation_id: item.service_recommendation_id ?? null,
    display_order:           idx,
    created_at:              now,
    updated_at:              now,
  }))

  const { error: wiErr } = await supabase
    .from('work_order_items')
    .insert(woItems)

  if (wiErr) {
    console.error('[createWorkOrderFromApprovedItems] create work_order_items failed:', wiErr.message)
    // Clean up the work order we just created
    await supabase.from('work_orders').delete().eq('id', workOrderId)
    return { error: wiErr.message }
  }

  console.log('[createWorkOrderFromApprovedItems] work order items created', {
    count: woItems.length,
  })

  return { data: { workOrderId } }
}

// ── Finalize Estimate Approval ──────────────────────────────────────────────────
/**
 * Complete final authorization flow:
 * 1. Validate that approved items exist
 * 2. Create or reuse work order from approved items
 * 3. Update estimate with approval metadata
 * 4. Return work order ID for redirect
 */
export async function finalizeEstimateApproval(
  estimateId: string,
  approvedByName: string | null,
): Promise<{ data?: { workOrderId: string }; error?: string }> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authenticated' }

  const finalizeDenied = await denyUnlessCanEditAllDashboardModules(['estimates', 'work_orders'])
  if (finalizeDenied) return { error: finalizeDenied.error }

  const tenantId = ctx.tenant.id
  const supabase = createAdminClient()

  // ── 1. Load estimate with items and decisions ──────────────────────────────
  const { data: estimate, error: estErr } = await supabase
    .from('estimates')
    .select(
      `id, tenant_id, customer_id, vehicle_id, inspection_id,
       estimate_number, notes, internal_notes,
       tax_rate, parts_markup_percent, subtotal, tax_amount, total`,
    )
    .eq('id', estimateId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (estErr || !estimate) {
    return { error: 'Estimate not found' }
  }

  // ── 2. Load estimate items ─────────────────────────────────────────────────
  const { data: items, error: itemsErr } = await supabase
    .from('estimate_items')
    .select('*')
    .eq('estimate_id', estimateId)
    .eq('tenant_id', tenantId)

  if (itemsErr) {
    return { error: 'Could not load estimate items' }
  }

  // ── 3. Load decisions ──────────────────────────────────────────────────────
  const { data: decisions, error: decisionsErr } = await supabase
    .from('estimate_item_decisions')
    .select('estimate_item_id, decision')
    .eq('estimate_id', estimateId)
    .eq('tenant_id', tenantId)

  if (decisionsErr) {
    return { error: 'Could not load item decisions' }
  }

  // ── 4. Validate approved items exist ───────────────────────────────────────
  const approvedItemIds = new Set(
    decisions
      .filter(d => d.decision === 'approved')
      .map(d => d.estimate_item_id),
  )

  if (approvedItemIds.size === 0) {
    return { error: 'No approved items to authorize' }
  }

  // ── 5. Create or reuse work order ──────────────────────────────────────────
  // Check for existing work order first (idempotency)
  const { data: existingWO } = await supabase
    .from('work_orders')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('estimate_id', estimateId)
    .maybeSingle()

  let workOrderId: string

  if (existingWO) {
    workOrderId = existingWO.id
  } else {
    // Create new work order
    const approvedItems = items.filter(item => approvedItemIds.has(item.id))

    const woSubtotal = Math.round(
      approvedItems.reduce((sum, item) => sum + item.line_total, 0) * 100,
    ) / 100

    const woTaxAmount = estimate.tax_rate != null
      ? Math.round(woSubtotal * estimate.tax_rate * 100) / 100
      : 0

    const woTotal = Math.round((woSubtotal + woTaxAmount) * 100) / 100

    const workOrderNumber = `WO-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')}`

    const { data: woData, error: woErr } = await supabase
      .from('work_orders')
      .insert({
        tenant_id: tenantId,
        estimate_id: estimateId,
        inspection_id: estimate.inspection_id,
        customer_id: estimate.customer_id,
        vehicle_id: estimate.vehicle_id,
        work_order_number: workOrderNumber,
        creation_mode: 'from_estimate',
        status: 'draft',
        subtotal: woSubtotal,
        tax_rate: estimate.tax_rate,
        tax_amount: woTaxAmount,
        total: woTotal,
        notes: estimate.notes,
        internal_notes: estimate.internal_notes,
        parts_markup_percent: estimate.parts_markup_percent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (woErr || !woData) {
      return { error: 'Failed to create work order' }
    }

    workOrderId = woData.id

    // ── Insert work order items ────────────────────────────────────────────
    const woItems = approvedItems.map((item, idx) => ({
      tenant_id: tenantId,
      work_order_id: workOrderId,
      estimate_item_id: item.id,
      service_job_id: item.service_job_id,
      title: item.title,
      description: item.description,
      category: item.category,
      labor_hours: item.labor_hours,
      labor_rate: item.labor_rate,
      labor_total: item.labor_total,
      parts_total: item.parts_total,
      line_total: item.line_total,
      inspection_item_id: item.inspection_item_id,
      service_recommendation_id: item.service_recommendation_id,
      display_order: idx,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    const { error: itemsInsertErr } = await supabase
      .from('work_order_items')
      .insert(woItems)

    if (itemsInsertErr) {
      // Rollback work order
      await supabase.from('work_orders').delete().eq('id', workOrderId)
      return { error: 'Failed to create work order items' }
    }
  }

  // ── 6. Update estimate with approval metadata ──────────────────────────────
  const now = new Date().toISOString()
  const { error: updateErr } = await supabase
    .from('estimates')
    .update({
      status: 'approved',
      approved_by_name: approvedByName || null,
      approval_method: 'in_person',
      approved_at: now,
      updated_at: now,
    })
    .eq('id', estimateId)
    .eq('tenant_id', tenantId)

  if (updateErr) {
    return { error: 'Failed to update estimate approval status' }
  }

  console.log('[finalizeEstimateApproval] Success', {
    estimateId,
    workOrderId,
    approvedByName,
  })

  return { data: { workOrderId } }
}
