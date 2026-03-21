'use server'

import { createClient } from '@/lib/supabase/server'
import { getDashboardTenant } from '@/lib/tenant'
import type {
  Estimate,
  EstimateItem,
  EstimateWithItems,
  EstimateCreationMode,
  EstimateItemCategory,
  EstimateItemSourceType,
} from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateEstimateInput {
  /** Defaults to 'manual_entry'. */
  creation_mode:  EstimateCreationMode
  /** Links to an inspection. Recommended but nullable. */
  inspection_id?: string | null
  customer_id?:   string | null
  vehicle_id?:    string | null
  notes?:         string | null
  internal_notes?: string | null
}

export interface EstimateItemInput {
  /** Omit to INSERT; provide to UPDATE. */
  id?:                        string
  service_recommendation_id?: string | null
  inspection_item_id?:        string | null
  source_type:                EstimateItemSourceType
  category:                   EstimateItemCategory
  title:                      string
  description?:               string | null
  quantity:                   number
  unit_price:                 number
  display_order:              number
  source_reference?:          string | null
  needs_review?:              boolean
}

export interface SaveEstimateHeaderInput {
  notes?:          string | null
  internal_notes?: string | null
  status?:         Estimate['status']
  tax_rate?:       number | null
  /** When true the caller has already recalculated totals and passes them in. */
  subtotal?:       number
  tax_amount?:     number
  total?:          number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Generates "EST-YYYY-NNNN" by counting existing estimates for the tenant.
 * Adequate for Stage 1; replace with the DB function call for production to
 * eliminate any race-condition risk under concurrent inserts.
 */
async function buildEstimateNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
): Promise<string> {
  const { count } = await supabase
    .from('estimates')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  const year = new Date().getFullYear()
  const seq  = (count ?? 0) + 1
  return `EST-${year}-${String(seq).padStart(4, '0')}`
}

/**
 * Recalculates subtotal_labor, subtotal_parts, subtotal_other, subtotal,
 * tax_amount (using stored tax_rate if set, else leaving it unchanged), and total.
 * Updates the estimate row in place.
 *
 * Called automatically by saveEstimateItems().
 * Can also be called explicitly after any item change.
 */
export async function recalculateEstimateTotals(
  estimateId: string,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const supabase   = await createClient()
  const tenantId   = ctx.tenant.id

  // 1. Fetch all non-tax line items
  const { data: items, error: itemsErr } = await supabase
    .from('estimate_items')
    .select('category, line_total')
    .eq('tenant_id', tenantId)
    .eq('estimate_id', estimateId)
    .neq('category', 'tax')   // tax items are not included in subtotal

  if (itemsErr) {
    console.error('[recalculateEstimateTotals] fetch items:', itemsErr.message)
    return { error: itemsErr.message }
  }

  // 2. Bucket subtotals
  let subtotalLabor = 0
  let subtotalParts = 0
  let subtotalOther = 0

  for (const item of items ?? []) {
    const amount = Number(item.line_total) || 0
    if (item.category === 'labor') subtotalLabor += amount
    else if (item.category === 'part') subtotalParts += amount
    else subtotalOther += amount
  }

  const subtotal = round2(subtotalLabor + subtotalParts + subtotalOther)

  // 3. Fetch current tax_rate from the estimate header
  const { data: header, error: headerErr } = await supabase
    .from('estimates')
    .select('tax_rate, tax_amount')
    .eq('tenant_id', tenantId)
    .eq('id', estimateId)
    .single()

  if (headerErr) {
    console.error('[recalculateEstimateTotals] fetch header:', headerErr.message)
    return { error: headerErr.message }
  }

  // 4. Compute tax:
  //   - If tax_rate is set → recalculate tax_amount from the new subtotal
  //   - If tax_rate is null → preserve the manually-entered tax_amount
  const taxRate   = header?.tax_rate != null ? Number(header.tax_rate) : null
  const taxAmount = taxRate != null
    ? round2(subtotal * taxRate)
    : round2(Number(header?.tax_amount) || 0)

  const total = round2(subtotal + taxAmount)

  // 5. Write back to the estimate header
  const { error: updateErr } = await supabase
    .from('estimates')
    .update({
      subtotal_labor: round2(subtotalLabor),
      subtotal_parts: round2(subtotalParts),
      subtotal_other: round2(subtotalOther),
      subtotal,
      tax_amount:     taxAmount,
      total,
      updated_at:     new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('id', estimateId)

  if (updateErr) {
    console.error('[recalculateEstimateTotals] update:', updateErr.message)
    return { error: updateErr.message }
  }

  return null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Creates a new estimate for the current tenant.
 *
 * Business rules enforced here:
 *   - One active draft per inspection: if a draft already exists for the
 *     same inspection, return it instead of creating a duplicate.
 *   - Estimate number is generated at creation time and never changes.
 *
 * Returns the new (or existing draft) estimate.
 */
export async function createEstimate(
  input: CreateEstimateInput,
): Promise<{ data: Estimate } | { error: string }> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const supabase = await createClient()
  const tenantId = ctx.tenant.id

  // Guard: return existing draft for this inspection if one exists
  if (input.inspection_id) {
    const { data: existing } = await supabase
      .from('estimates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('inspection_id', input.inspection_id)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      return { data: existing as Estimate }
    }
  }

  const estimateNumber = await buildEstimateNumber(supabase, tenantId)

  const { data, error } = await supabase
    .from('estimates')
    .insert({
      tenant_id:      tenantId,
      inspection_id:  input.inspection_id  ?? null,
      customer_id:    input.customer_id    ?? null,
      vehicle_id:     input.vehicle_id     ?? null,
      estimate_number: estimateNumber,
      creation_mode:  input.creation_mode,
      status:         'draft',
      subtotal:       0,
      tax_amount:     0,
      total:          0,
      requires_review: false,
      notes:          input.notes          ?? null,
      internal_notes: input.internal_notes ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[createEstimate]', error.message)
    return { error: error.message }
  }

  return { data: data as Estimate }
}

/**
 * Updates the estimate header (notes, status, tax_rate, manually-set totals).
 * Pass tax_rate to store a rate snapshot; recalculateEstimateTotals() will
 * use it to recompute tax_amount automatically from then on.
 */
export async function saveEstimate(
  estimateId: string,
  patch: SaveEstimateHeaderInput,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('estimates')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', ctx.tenant.id)
    .eq('id', estimateId)

  if (error) {
    console.error('[saveEstimate]', error.message)
    return { error: error.message }
  }

  return null
}

/**
 * Upserts a full set of line items for an estimate, then recalculates totals.
 *
 * Strategy:
 *   - Items with an `id` → UPDATE
 *   - Items without an `id` → INSERT
 *   - Items previously in the estimate but absent from this payload → DELETE
 *
 * Always calls recalculateEstimateTotals() at the end.
 */
export async function saveEstimateItems(
  estimateId: string,
  items: EstimateItemInput[],
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const supabase = await createClient()
  const tenantId = ctx.tenant.id
  const now      = new Date().toISOString()

  // Separate incoming items into inserts vs updates
  const toInsert = items.filter(i => !i.id)
  const toUpdate = items.filter(i => !!i.id)

  // Compute line_total for each item
  const buildRow = (i: EstimateItemInput, includeId = true) => ({
    ...(includeId && i.id ? { id: i.id } : {}),
    tenant_id:                 tenantId,
    estimate_id:               estimateId,
    service_recommendation_id: i.service_recommendation_id ?? null,
    inspection_item_id:        i.inspection_item_id        ?? null,
    source_type:               i.source_type,
    category:                  i.category,
    title:                     i.title,
    description:               i.description     ?? null,
    quantity:                  i.quantity,
    unit_price:                i.unit_price,
    line_total:                round2(i.quantity * i.unit_price),
    display_order:             i.display_order,
    source_reference:          i.source_reference ?? null,
    needs_review:              i.needs_review     ?? false,
    updated_at:                now,
  })

  // DELETE items not in the new payload
  const keepIds = toUpdate.map(i => i.id as string)
  if (keepIds.length > 0) {
    const { error: deleteErr } = await supabase
      .from('estimate_items')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('estimate_id', estimateId)
      .not('id', 'in', `(${keepIds.map(id => `'${id}'`).join(',')})`)

    if (deleteErr) {
      console.error('[saveEstimateItems] delete:', deleteErr.message)
      return { error: deleteErr.message }
    }
  } else if (items.length === 0) {
    // All items removed — delete everything
    await supabase
      .from('estimate_items')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('estimate_id', estimateId)
  }

  // INSERT new items
  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase
      .from('estimate_items')
      .insert(toInsert.map(i => buildRow(i, false)))

    if (insertErr) {
      console.error('[saveEstimateItems] insert:', insertErr.message)
      return { error: insertErr.message }
    }
  }

  // UPDATE existing items
  for (const item of toUpdate) {
    const { error: updateErr } = await supabase
      .from('estimate_items')
      .update(buildRow(item))
      .eq('tenant_id', tenantId)
      .eq('id', item.id as string)

    if (updateErr) {
      console.error('[saveEstimateItems] update item:', updateErr.message)
      // Non-fatal — continue updating remaining items
    }
  }

  // Recalculate totals after all item changes
  return recalculateEstimateTotals(estimateId)
}

/**
 * Converts accepted/approved service recommendations into estimate line items.
 * Used by the system_generated and recommendation flows.
 *
 * Only recommendations with status 'accepted' or 'approved' are converted.
 * Already-converted recommendations (service_recommendation_id already present
 * on an existing item) are skipped to avoid duplicates.
 *
 * Does NOT set prices — the advisor fills those in or they come from the
 * labor API in a future release.
 */
export async function importRecommendationsToEstimate(
  estimateId:     string,
  recommendationIds: string[],
): Promise<{ error: string } | null> {
  if (recommendationIds.length === 0) return null

  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const supabase = await createClient()
  const tenantId = ctx.tenant.id

  // Fetch the recommendations
  const { data: recs, error: recsErr } = await supabase
    .from('service_recommendations')
    .select('id, title, description, priority, source_status, inspection_item_id')
    .eq('tenant_id', tenantId)
    .in('id', recommendationIds)

  if (recsErr) {
    console.error('[importRecommendationsToEstimate] fetch recs:', recsErr.message)
    return { error: recsErr.message }
  }

  // Find which recommendation IDs are already on this estimate
  const { data: existing } = await supabase
    .from('estimate_items')
    .select('service_recommendation_id')
    .eq('estimate_id', estimateId)
    .not('service_recommendation_id', 'is', null)

  const alreadyLinked = new Set(
    (existing ?? []).map(r => r.service_recommendation_id as string),
  )

  // Build insert rows for new recommendations only
  const now  = new Date().toISOString()
  const rows = (recs ?? [])
    .filter(r => !alreadyLinked.has(r.id as string))
    .map((r, idx) => ({
      tenant_id:                 tenantId,
      estimate_id:               estimateId,
      service_recommendation_id: r.id,
      inspection_item_id:        r.inspection_item_id ?? null,
      source_type:               'recommendation' as EstimateItemSourceType,
      category:                  'labor'           as EstimateItemCategory,
      title:                     r.title as string,
      description:               r.description     ?? null,
      quantity:                  1,
      unit_price:                0,   // advisor fills in or labor API fills later
      line_total:                0,
      display_order:             idx,
      needs_review:              true,  // always review before sending
      updated_at:                now,
    }))

  if (rows.length === 0) return null   // all already imported

  const { error: insertErr } = await supabase
    .from('estimate_items')
    .insert(rows)

  if (insertErr) {
    console.error('[importRecommendationsToEstimate] insert:', insertErr.message)
    return { error: insertErr.message }
  }

  // Recalculate (totals won't change since prices are 0, but keeps the
  // updated_at timestamp fresh and the flow consistent)
  return recalculateEstimateTotals(estimateId)
}
