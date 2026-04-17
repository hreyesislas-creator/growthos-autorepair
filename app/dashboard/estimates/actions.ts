'use server'

import { denyUnlessCanEditDashboardModule } from '@/lib/auth/roles'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getDashboardTenant } from '@/lib/tenant'
import { getTenantPricingConfig } from '@/lib/queries'
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
  /**
   * When set, the item uses the job-based pricing model:
   *   line_total = labor_total + parts_total
   * When null, the item uses the legacy model:
   *   line_total = round(quantity * unit_price, 2)
   */
  service_job_id?:            string | null
  source_type:                EstimateItemSourceType
  category:                   EstimateItemCategory
  title:                      string
  description?:               string | null
  // Legacy pricing model
  quantity:                   number
  unit_price:                 number
  // Job-based pricing model (used when service_job_id is set)
  labor_hours?:               number | null
  labor_rate?:                number | null
  labor_total?:               number
  parts_total?:               number
  // Shared
  notes?:                     string | null
  display_order:              number
  source_reference?:          string | null
  needs_review?:              boolean
}

export interface EstimateItemPartInput {
  /** Omit to INSERT; provide to UPDATE. */
  id?:              string
  estimate_item_id: string
  name:             string
  quantity:         number
  unit_cost:        number
  profit_amount:    number
  /** = unit_cost + profit_amount — client pre-computes */
  unit_sell_price:  number
  /** = quantity × unit_sell_price — client pre-computes */
  line_total:       number
  display_order:    number
}

export interface SaveEstimateHeaderInput {
  notes?:                string | null
  internal_notes?:       string | null
  status?:               Estimate['status']
  tax_rate?:             number | null
  /**
   * Parts markup as a percentage (e.g. 30.00 = 30%).
   * Formula: unit_sell_price = unit_cost × (1 + parts_markup_percent / 100)
   * Tax is applied to parts only — labor is never taxed.
   */
  parts_markup_percent?: number | null
  /** When true the caller has already recalculated totals and passes them in. */
  subtotal?:             number
  tax_amount?:           number
  total?:                number
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

  const estDenied = await denyUnlessCanEditDashboardModule('estimates')
  if (estDenied) return estDenied

  const supabase   = await createAdminClient()
  const tenantId   = ctx.tenant.id

  // 1. Fetch all non-tax line items.
  //    For job-mode items (service_job_id IS NOT NULL) we read labor_total and
  //    parts_total separately so they can be bucketed correctly for tax.
  //    For manual items we use the category to decide the bucket.
  const { data: items, error: itemsErr } = await supabase
    .from('estimate_items')
    .select('category, line_total, service_job_id, labor_total, parts_total')
    .eq('tenant_id', tenantId)
    .eq('estimate_id', estimateId)
    .neq('category', 'tax')

  if (itemsErr) {
    console.error('[recalculateEstimateTotals] fetch items:', itemsErr.message)
    return { error: itemsErr.message }
  }

  console.log('[recalculateEstimateTotals] RUNTIME AUDIT START', {
    estimateId,
    itemCount: items?.length ?? 0,
  })

  // 2. Bucket subtotals — unified financial model.
  //    RULE: Tax applies to PARTS ONLY — labor is never taxed.
  //
  //    ALL items now use the unified model:
  //    - subtotalLabor = SUM(labor_total) for all items
  //    - subtotalParts = SUM(parts_total) for all items
  //    - subtotalOther = line_total for misc/fee items only
  //
  //    Why: Manual labor items can now have nested estimate_item_parts
  //    that are synced into parts_total. The old dual model (job vs. manual)
  //    doesn't work anymore because it ignored parts_total for manual items.
  //
  //    This unified model ensures:
  //    - Labor costs always go to subtotalLabor
  //    - Parts costs always go to subtotalParts (whether from job or manual item)
  //    - Tax is applied only to subtotalParts
  let subtotalLabor = 0
  let subtotalParts = 0
  let subtotalOther = 0

  for (const item of items ?? []) {
    const laborTotal = Number(item.labor_total ?? 0)
    const partsTotal = Number(item.parts_total ?? 0)
    const lineTotal = Number(item.line_total || 0)

    console.log('[recalculateEstimateTotals] ITEM DETAILS', {
      category: item.category,
      service_job_id: item.service_job_id,
      labor_total: laborTotal,
      parts_total: partsTotal,
      line_total: lineTotal,
      isMiscOrFee: item.category === 'misc' || item.category === 'fee',
    })

    if (item.category === 'misc' || item.category === 'fee') {
      // Misc/fee items: use line_total as-is, no labor/parts breakdown
      const amount = lineTotal
      subtotalOther += amount
      console.log('[recalculateEstimateTotals] MISC/FEE ITEM', {
        amount,
        newSubtotalOther: subtotalOther,
      })
    } else {
      // Labor, part, job items: always sum labor_total and parts_total separately
      // This works for both job-mode items and manual labor items with nested parts
      subtotalLabor += laborTotal
      subtotalParts += partsTotal
      console.log('[recalculateEstimateTotals] LABOR/PART ITEM', {
        laborTotal,
        partsTotal,
        newSubtotalLabor: subtotalLabor,
        newSubtotalParts: subtotalParts,
      })
    }
  }

  console.log('[recalculateEstimateTotals] ACCUMULATORS BEFORE ROUNDING', {
    subtotalLabor,
    subtotalParts,
    subtotalOther,
  })

  const subtotalLabor2 = round2(subtotalLabor)
  const subtotalParts2 = round2(subtotalParts)
  const subtotalOther2 = round2(subtotalOther)
  const subtotal       = round2(subtotalLabor2 + subtotalParts2 + subtotalOther2)

  console.log('[recalculateEstimateTotals] AFTER ROUNDING', {
    subtotalLabor2,
    subtotalParts2,
    subtotalOther2,
    subtotal,
  })

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

  // 4. Compute tax on PARTS ONLY.
  //   - If tax_rate is set → tax_amount = parts_subtotal * tax_rate
  //   - If tax_rate is null → preserve the manually-entered tax_amount
  const taxRate   = header?.tax_rate != null ? Number(header.tax_rate) : null
  const taxAmount = taxRate != null
    ? round2(subtotalParts2 * taxRate)   // ← parts only, NOT full subtotal
    : round2(Number(header?.tax_amount) || 0)

  const total = round2(subtotal + taxAmount)

  console.log('[recalculateEstimateTotals] TAX CALCULATION', {
    taxRate,
    subtotalParts2,
    taxAmount,
    total,
  })

  // 5. Write back to the estimate header
  console.log('[recalculateEstimateTotals] WRITING TO DATABASE', {
    estimateId,
    tenantId,
    payload: {
      subtotal_labor: subtotalLabor2,
      subtotal_parts: subtotalParts2,
      subtotal_other: subtotalOther2,
      subtotal,
      tax_amount:     taxAmount,
      total,
    },
  })

  const { error: updateErr } = await supabase
    .from('estimates')
    .update({
      subtotal_labor: subtotalLabor2,
      subtotal_parts: subtotalParts2,
      subtotal_other: subtotalOther2,
      subtotal,
      tax_amount:     taxAmount,
      total,
      updated_at:     new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('id', estimateId)

  if (updateErr) {
    console.error('[recalculateEstimateTotals] UPDATE FAILED', {
      error: updateErr.message,
      code: updateErr.code,
      details: updateErr.details,
    })
    return { error: updateErr.message }
  }

  console.log('[recalculateEstimateTotals] SUCCESS - totals updated', {
    estimateId,
    subtotal_labor: subtotalLabor2,
    subtotal_parts: subtotalParts2,
    total,
  })

  return null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Maps service_recommendations.recommendation_type to a valid EstimateItemCategory.
 * The recommendation_type column is freeform text; we normalise it here.
 */
function recTypeToCategory(type: string | null | undefined): EstimateItemCategory {
  switch ((type ?? '').toLowerCase()) {
    case 'labor':  return 'labor'
    case 'part':   return 'part'
    case 'parts':  return 'part'
    case 'fee':    return 'fee'
    default:       return 'misc'
  }
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

  const estDenied = await denyUnlessCanEditDashboardModule('estimates')
  if (estDenied) return estDenied

  const supabase = await createAdminClient()
  const tenantId = ctx.tenant.id

  console.log('[createEstimate] START', {
    tenantId,
    tenantSlug: ctx.tenant.slug,
    inspectionId: input.inspection_id,
    creationMode: input.creation_mode,
  })

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
      console.log('[createEstimate] RETURNING EXISTING DRAFT', {
        estimateId: existing.id,
        estimateNumber: existing.estimate_number,
      })
      return { data: existing as Estimate }
    }
  }

  const [estimateNumber, pricingConfig] = await Promise.all([
    buildEstimateNumber(supabase, tenantId),
    getTenantPricingConfig(tenantId),
  ])

  // Pre-fill rates from the tenant's defaults if configured.
  // tax_amount starts at 0 because the estimate has no line items yet;
  // recalculateEstimateTotals() will compute it correctly once items are saved.
  const defaultTaxRate     = pricingConfig?.default_tax_rate     ?? null
  const defaultMarkupPct   = pricingConfig?.parts_markup_percent ?? 0

  console.log('[createEstimate] INSERT PAYLOAD', {
    tenant_id: tenantId,
    inspection_id: input.inspection_id ?? null,
    customer_id: input.customer_id ?? null,
    vehicle_id: input.vehicle_id ?? null,
    estimate_number: estimateNumber,
    creation_mode: input.creation_mode,
    status: 'draft',
    tax_rate: defaultTaxRate,
    parts_markup_percent: defaultMarkupPct,
  })

  const { data, error } = await supabase
    .from('estimates')
    .insert({
      tenant_id:            tenantId,
      inspection_id:        input.inspection_id  ?? null,
      customer_id:          input.customer_id    ?? null,
      vehicle_id:           input.vehicle_id     ?? null,
      estimate_number:      estimateNumber,
      creation_mode:        input.creation_mode,
      status:               'draft',
      subtotal:             0,
      tax_rate:             defaultTaxRate,
      tax_amount:           0,
      total:                0,
      parts_markup_percent: defaultMarkupPct,
      requires_review:      false,
      notes:                input.notes          ?? null,
      internal_notes:       input.internal_notes ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[createEstimate] INSERT FAILED', error.message)
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

  const estDenied = await denyUnlessCanEditDashboardModule('estimates')
  if (estDenied) return estDenied

  const supabase = await createAdminClient()

  const updatePayload = {
    ...patch,
    updated_at: new Date().toISOString(),
  }

  console.log('[saveEstimate] Writing to estimates table', {
    estimateId,
    tenantId: ctx.tenant.id,
    updatePayload,
    updatePayloadKeys: Object.keys(updatePayload),
    statusValue: updatePayload.status,
    statusType: typeof updatePayload.status,
  })

  // Test: Log all field values to debug constraint issue
  console.log('[saveEstimate] Full payload details', {
    status: updatePayload.status,
    status_typeof: typeof updatePayload.status,
    status_JSON: JSON.stringify(updatePayload.status),
    notes: updatePayload.notes,
    internal_notes: updatePayload.internal_notes,
    tax_rate: updatePayload.tax_rate,
    parts_markup_percent: updatePayload.parts_markup_percent,
    tax_amount: updatePayload.tax_amount,
    updated_at: updatePayload.updated_at,
  })

  const { error } = await supabase
    .from('estimates')
    .update(updatePayload)
    .eq('tenant_id', ctx.tenant.id)
    .eq('id', estimateId)

  if (error) {
    console.error('[saveEstimate] ERROR', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      statusFromPayload: updatePayload.status,
    })
    return { error: error.message }
  }

  console.log('[saveEstimate] Success')
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
): Promise<{ data: EstimateItem[] } | { error: string }> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const estDenied = await denyUnlessCanEditDashboardModule('estimates')
  if (estDenied) return estDenied

  const supabase = await createClient()
  const tenantId = ctx.tenant.id
  const now      = new Date().toISOString()

  const inserted: EstimateItem[] = []
  const updated:  EstimateItem[] = []

  // Separate incoming items into inserts vs updates
  const toInsert = items.filter(i => !i.id)
  const toUpdate = items.filter(i => !!i.id)

  // Compute line_total for each item.
  // Job-based:         line_total = labor_total + parts_total (service_job_id set)
  // Manual labor:      line_total = labor_hours × labor_rate  (category === 'labor', no job)
  // Legacy (other):    line_total = round(quantity × unit_price, 2)
  const buildRow = (i: EstimateItemInput, includeId = true) => {
    const isJobMode    = !!i.service_job_id
    // Manual labor items priced by hours × rate, not qty × unit_price
    const isManualLabor = !isJobMode && i.category === 'labor'
    const isLaborMode  = isJobMode || isManualLabor
    const laborTotal   = isLaborMode ? round2((i.labor_hours ?? 0) * (i.labor_rate ?? 0)) : 0
    const partsTotal   = round2(i.parts_total ?? 0)
    const lineTotal    = isJobMode
      ? round2(laborTotal + partsTotal)
      : isManualLabor
        ? laborTotal                          // manual labor: hours × rate
        : round2(i.quantity * i.unit_price)   // everything else: qty × price

    return {
      ...(includeId && i.id ? { id: i.id } : {}),
      tenant_id:                 tenantId,
      estimate_id:               estimateId,
      service_recommendation_id: i.service_recommendation_id ?? null,
      inspection_item_id:        i.inspection_item_id        ?? null,
      service_job_id:            i.service_job_id            ?? null,
      source_type:               i.source_type,
      category:                  i.category,
      title:                     i.title,
      description:               i.description     ?? null,
      quantity:                  isJobMode ? 1 : i.quantity,
      unit_price:                isJobMode ? 0 : i.unit_price,
      labor_hours:               isLaborMode ? (i.labor_hours ?? null) : null,
      labor_rate:                isLaborMode ? (i.labor_rate  ?? null) : null,
      labor_total:               isLaborMode ? laborTotal : 0,
      parts_total:               isLaborMode ? partsTotal : 0,
      line_total:                lineTotal,
      display_order:             i.display_order,
      source_reference:          i.source_reference ?? null,
      needs_review:              i.needs_review     ?? false,
      notes:                     i.notes            ?? null,
      updated_at:                now,
    }
  }

  // DELETE items not in the new payload.
  // IMPORTANT: PostgREST NOT IN filter must NOT wrap UUID values in single quotes.
  // Postgres receives the literal character ' as part of the value and rejects it
  // with "invalid input syntax for type uuid". Use bare UUIDs: (uuid1,uuid2).
  const keepIds = toUpdate.map(i => i.id as string)
  if (keepIds.length > 0) {
    // Delete any rows no longer in the payload (items were removed by the user).
    const { error: deleteErr } = await supabase
      .from('estimate_items')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('estimate_id', estimateId)
      .not('id', 'in', `(${keepIds.join(',')})`)

    if (deleteErr) {
      console.error('[saveEstimateItems] delete:', deleteErr.message)
      return { error: deleteErr.message }
    }
  } else {
    // keepIds is empty — either all items were removed, or all incoming items are
    // brand-new (no IDs).  In both cases we must delete ALL existing rows first so
    // that a subsequent INSERT never creates duplicates on top of stale DB rows.
    const { error: deleteErr } = await supabase
      .from('estimate_items')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('estimate_id', estimateId)

    if (deleteErr) {
      console.error('[saveEstimateItems] delete-all:', deleteErr.message)
      return { error: deleteErr.message }
    }
  }

  // INSERT new items
  if (toInsert.length > 0) {
    const { data: insertedData, error: insertErr } = await supabase
      .from('estimate_items')
      .insert(toInsert.map(i => buildRow(i, false)))
      .select()

    if (insertErr) {
      console.error('[saveEstimateItems] insert:', insertErr.message)
      return { error: insertErr.message }
    }
    inserted.push(...(insertedData ?? []))
  }

  // UPDATE existing items
  for (const item of toUpdate) {
    const { data: updatedData, error: updateErr } = await supabase
      .from('estimate_items')
      .update(buildRow(item))
      .eq('tenant_id', tenantId)
      .eq('id', item.id as string)
      .select()
      .single()

    if (updateErr) {
      console.error('[saveEstimateItems] update item:', updateErr.message)
    } else if (updatedData) {
      updated.push(updatedData)
    }
  }

  // Recalculate totals after all item changes
  const totalsErr = await recalculateEstimateTotals(estimateId)
  if (totalsErr) return { error: totalsErr.error }

  const allSaved = [...updated, ...inserted]
  allSaved.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
  return { data: allSaved as EstimateItem[] }
}

/**
 * Imports service recommendations (inspection findings) as estimate line items.
 *
 * Called automatically when creating an estimate from an inspection — ALL
 * findings are imported so the advisor can decide what to present to the
 * customer inside the estimate editor (remove anything not being shown).
 *
 * Already-imported recommendations (service_recommendation_id already present
 * on an existing item) are skipped to avoid duplicates.
 *
 * Does NOT set prices — the advisor fills those in or they come from the
 * service job catalog in the estimate editor.
 */
export async function importRecommendationsToEstimate(
  estimateId:     string,
  recommendationIds: string[],
): Promise<{ error: string } | null> {
  if (recommendationIds.length === 0) return null

  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const estDenied = await denyUnlessCanEditDashboardModule('estimates')
  if (estDenied) return estDenied

  const supabase = await createClient()
  const tenantId = ctx.tenant.id

  // Fetch the recommendations — include estimated_price and recommendation_type
  // so we can pre-fill unit_price and category correctly.
  const { data: recs, error: recsErr } = await supabase
    .from('service_recommendations')
    .select('id, title, description, recommendation_type, estimated_price, inspection_item_id')
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

  // Build insert rows for new recommendations only.
  // Only include columns that exist in the real estimate_items schema.
  const now  = new Date().toISOString()
  const rows = (recs ?? [])
    .filter(r => !alreadyLinked.has(r.id as string))
    .map((r: any, idx) => {
      const unitPrice = round2(Number((r as any).estimated_price ?? 0))
      return {
        tenant_id:                 tenantId,
        estimate_id:               estimateId,
        service_recommendation_id: r.id,
        inspection_item_id:        r.inspection_item_id ?? null,
        source_type:               'recommendation' as EstimateItemSourceType,
        category:                  recTypeToCategory((r as any).recommendation_type),
        title:                     r.title as string,
        description:               r.description     ?? null,
        quantity:                  1,
        unit_price:                unitPrice,
        line_total:                unitPrice,  // quantity=1, so line_total = unit_price
        display_order:             idx,
        needs_review:              true,  // always review before sending
        updated_at:                now,
      }
    })

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

// ── Combined action: create estimate + import all findings ─────────────────

/**
 * Creates an estimate from an inspection and imports ALL findings as line
 * items in a single server round-trip.
 *
 * This is the canonical entry point when "Create Estimate" is clicked from
 * the Inspection view. It is intentionally server-driven so it never depends
 * on stale client-side recommendation IDs.
 *
 * Flow:
 *   1. Create (or return existing draft) estimate for the inspection
 *   2. Query service_recommendations by inspection_id — fresh from the DB
 *   3. Insert any not-yet-imported findings as estimate_items
 *   4. Recalculate totals
 *
 * Returns { data: { estimateId } } on success, { error } on failure.
 */
export async function createEstimateFromInspection(input: {
  inspection_id: string
  customer_id?:  string | null
  vehicle_id?:   string | null
}): Promise<{ data: { estimateId: string } } | { error: string }> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const estDenied = await denyUnlessCanEditDashboardModule('estimates')
  if (estDenied) return estDenied

  const supabase = await createAdminClient()
  const tenantId = ctx.tenant.id

  console.log('[createEstimateFromInspection] start', {
    tenantId,
    inspection_id: input.inspection_id,
  })

  // ── Step 1: Fetch pricing config + create/return existing draft ──────────
  // We need the pricing config here to seed labor_rate on imported labor items.
  // createEstimate also fetches it internally for the estimate header defaults.
  const [estimateResult, pricingConfig] = await Promise.all([
    createEstimate({
      creation_mode: 'system_generated',
      inspection_id: input.inspection_id,
      customer_id:   input.customer_id ?? null,
      vehicle_id:    input.vehicle_id  ?? null,
    }),
    getTenantPricingConfig(tenantId),
  ])
  const defaultLaborRate = Number(pricingConfig?.default_labor_rate ?? 0)

  if ('error' in estimateResult) {
    console.error('[createEstimateFromInspection] createEstimate failed:', estimateResult.error)
    return { error: estimateResult.error }
  }

  const estimateId = estimateResult.data.id
  console.log('[createEstimateFromInspection] estimate ready', { estimateId })

  // ── Step 2: Fetch ALL findings for this inspection fresh from DB ─────────
  // Include estimated_price, recommendation_type, inspection_item_id to pre-fill pricing + category.
  // service_recommendations.inspection_id links directly to inspections.id

  console.log('[createEstimateFromInspection] querying recommendations for inspection', {
    inspection_id: input.inspection_id,
    tenant_id: tenantId,
  })

  const { data: recs, error: recsErr } = await supabase
    .from('service_recommendations')
    .select('id, title, description, recommendation_type, estimated_price, inspection_item_id, item_name, priority, status')
    .eq('tenant_id', tenantId)
    .eq('inspection_id', input.inspection_id)

  if (recsErr) {
    console.error('[createEstimateFromInspection] fetch recommendations failed:', recsErr.message)
    // Non-fatal — continue to redirect, advisor can add items manually
    return { data: { estimateId } }
  }

  console.log('[createEstimateFromInspection] recommendations fetched', {
    count: recs?.length ?? 0,
    inspection_id: input.inspection_id,
    recommendations: recs?.map(r => ({ id: r.id, title: r.title, item_name: r.item_name })),
  })

  if (!recs || recs.length === 0) {
    console.log('[createEstimateFromInspection] no findings to import — done')
    return { data: { estimateId } }
  }

  // ── Step 3: Dedup — skip recommendations already linked on this estimate ──

  const { data: existing } = await supabase
    .from('estimate_items')
    .select('service_recommendation_id')
    .eq('estimate_id', estimateId)
    .not('service_recommendation_id', 'is', null)

  const alreadyLinked = new Set(
    (existing ?? []).map(r => r.service_recommendation_id as string),
  )

  const now  = new Date().toISOString()
  const rows = recs
    .filter(r => !alreadyLinked.has(r.id as string))
    .map((r: any, idx) => {
      const category  = recTypeToCategory((r as any).recommendation_type)
      const isLabor   = category === 'labor'
      const unitPrice = isLabor ? 0 : round2(Number((r as any).estimated_price ?? 0))

      // For labor recommendations: default to 1.0 hr at the shop's labor rate.
      // The advisor can adjust these in the estimate editor.
      const laborHours = isLabor ? 1.0 : null
      const laborRate  = isLabor ? defaultLaborRate : null
      const laborTotal = isLabor ? round2(1.0 * defaultLaborRate) : 0

      return {
        tenant_id:                 tenantId,
        estimate_id:               estimateId,
        service_recommendation_id: r.id,
        inspection_item_id:        r.inspection_item_id ?? null,
        source_type:               'recommendation' as EstimateItemSourceType,
        // Map recommendation_type → EstimateItemCategory; default to 'misc'
        category,
        title:                     r.title as string,
        description:               r.description     ?? null,
        quantity:                  1,
        unit_price:                unitPrice,
        labor_hours:               laborHours,
        labor_rate:                laborRate,
        labor_total:               laborTotal,
        parts_total:               0,
        // line_total = labor_total for labor items; unitPrice for others
        line_total:                isLabor ? laborTotal : unitPrice,
        display_order:             idx,
        needs_review:              true,
        created_at:                now,
        updated_at:                now,
      }
    })

  console.log('[createEstimateFromInspection] importing findings', {
    total:      recs.length,
    newToImport: rows.length,
    alreadyLinked: alreadyLinked.size,
    estimateId,
  })

  if (rows.length === 0) {
    // All already imported — nothing to do
    console.log('[createEstimateFromInspection] no new findings to import (all already linked)')
    return { data: { estimateId } }
  }

  // ── Step 4: Insert ────────────────────────────────────────────────────────
  // Log exact payload shape for diagnosis
  console.log('[createEstimateFromInspection] insert payload sample', {
    firstRow: rows[0],
    rowCount: rows.length,
    allRowIds: rows.map(r => r.service_recommendation_id),
  })

  const { data: insertedData, error: insertErr } = await supabase
    .from('estimate_items')
    .insert(rows)
    .select('id, service_recommendation_id, estimate_id, title')

  if (insertErr) {
    console.error('[createEstimateFromInspection] insert findings failed:', insertErr.message)
    console.error('[createEstimateFromInspection] insert error details:', insertErr)
    // Return error so the caller shows the advisor a clear message instead of
    // silently opening a blank estimate. The advisor can retry rather than
    // wondering why the items are missing.
    return { error: `Failed to import findings: ${insertErr.message}` }
  }

  console.log('[createEstimateFromInspection] findings imported successfully', {
    count: insertedData?.length ?? 0,
    insertedIds: insertedData?.map(r => r.id),
  })

  // ── Step 5: Recalculate totals ────────────────────────────────────────────

  await recalculateEstimateTotals(estimateId)

  return { data: { estimateId } }
}

/**
 * Saves all parts for an estimate in a full-replace upsert.
 *
 * Strategy:
 *   - Parts with an `id` → UPDATE
 *   - Parts without an `id` → INSERT
 *   - Parts previously in the estimate but absent from this payload → DELETE
 *
 * NOTE: Does NOT call recalculateEstimateTotals — the parent item's parts_total
 * is pre-computed by the client and saved via saveEstimateItems first.
 */
export async function saveEstimateItemParts(
  estimateId: string,
  parts: EstimateItemPartInput[],
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const estDenied = await denyUnlessCanEditDashboardModule('estimates')
  if (estDenied) return estDenied

  const supabase = await createAdminClient()
  const tenantId = ctx.tenant.id
  const now      = new Date().toISOString()

  const toInsert = parts.filter(p => !p.id)
  const toUpdate = parts.filter(p => !!p.id)

  // DELETE parts not in the new payload.
  // IMPORTANT: same UUID quoting rule — no single quotes around bare UUIDs.
  const keepIds = toUpdate.map(p => p.id as string)
  if (keepIds.length > 0) {
    const { error: deleteErr } = await supabase
      .from('estimate_item_parts')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('estimate_id', estimateId)
      .not('id', 'in', `(${keepIds.join(',')})`)

    if (deleteErr) {
      console.error('[saveEstimateItemParts] delete:', deleteErr.message)
      return { error: deleteErr.message }
    }
  } else {
    // All parts removed — delete everything for this estimate
    await supabase
      .from('estimate_item_parts')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('estimate_id', estimateId)
  }

  const buildPartRow = (p: EstimateItemPartInput, includeId = true) => ({
    ...(includeId && p.id ? { id: p.id } : {}),
    tenant_id:        tenantId,
    estimate_id:      estimateId,
    estimate_item_id: p.estimate_item_id,
    name:             p.name,
    quantity:         p.quantity,
    unit_cost:        p.unit_cost,
    profit_amount:    p.profit_amount,
    unit_sell_price:  p.unit_sell_price,
    line_total:       p.line_total,
    display_order:    p.display_order,
    updated_at:       now,
  })

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase
      .from('estimate_item_parts')
      .insert(toInsert.map(p => buildPartRow(p, false)))

    if (insertErr) {
      console.error('[saveEstimateItemParts] insert:', insertErr.message)
      return { error: insertErr.message }
    }
  }

  for (const part of toUpdate) {
    const { error: updateErr } = await supabase
      .from('estimate_item_parts')
      .update(buildPartRow(part))
      .eq('tenant_id', tenantId)
      .eq('id', part.id as string)

    if (updateErr) {
      console.error('[saveEstimateItemParts] update part:', updateErr.message)
    }
  }

  // ── SYNC: Synchronize parts back to estimate_items ────────────────────────────
  // After all estimate_item_parts operations, ensure estimate_items.parts_total
  // reflects the actual sum of estimate_item_parts.line_total, so that:
  // - item.line_total = labor_total + parts_total (accurate)
  // - estimate snapshot aggregates correctly

  // Fetch all current estimate_item_parts for this estimate
  const { data: currentParts, error: fetchPartsErr } = await supabase
    .from('estimate_item_parts')
    .select('estimate_item_id, line_total')
    .eq('tenant_id', tenantId)
    .eq('estimate_id', estimateId)

  if (fetchPartsErr) {
    console.error('[saveEstimateItemParts] fetch for sync:', fetchPartsErr.message)
    return { error: fetchPartsErr.message }
  }

  // Calculate parts_total for each estimate_item (SUM of part line_totals)
  const partsSumByItemId = new Map<string, number>()
  for (const part of currentParts ?? []) {
    const itemId = part.estimate_item_id as string
    const current = partsSumByItemId.get(itemId) ?? 0
    partsSumByItemId.set(itemId, round2(current + Number(part.line_total || 0)))
  }

  // Fetch all estimate_items to sync their financial fields
  const { data: allItems, error: fetchItemsErr } = await supabase
    .from('estimate_items')
    .select('id, labor_total, parts_total, line_total')
    .eq('tenant_id', tenantId)
    .eq('estimate_id', estimateId)

  if (fetchItemsErr) {
    console.error('[saveEstimateItemParts] fetch items:', fetchItemsErr.message)
    return { error: fetchItemsErr.message }
  }

  // Update items with recalculated parts_total and line_total
  const updatePromises: PromiseLike<any>[] = []
  console.log('[saveEstimateItemParts] SYNC: Starting item updates', {
    totalItems: allItems?.length ?? 0,
    partsSumByItemId: Object.fromEntries(partsSumByItemId),
  })

  for (const item of allItems ?? []) {
    const newPartsTotal = partsSumByItemId.get(item.id as string) ?? 0
    const laborTotal = round2(Number(item.labor_total || 0))
    const newLineTotal = round2(laborTotal + newPartsTotal)

    const currentPartsTotal = round2(Number(item.parts_total || 0))
    const currentLineTotal = round2(Number(item.line_total || 0))

    const partsTotalChanged = newPartsTotal !== currentPartsTotal
    const lineTotalChanged = newLineTotal !== currentLineTotal

    console.log('[saveEstimateItemParts] SYNC: Item evaluation', {
      itemId: item.id,
      laborTotal,
      currentPartsTotal,
      newPartsTotal,
      partsTotalChanged,
      currentLineTotal,
      newLineTotal,
      lineTotalChanged,
      shouldUpdate: partsTotalChanged || lineTotalChanged,
    })

    // Always update if parts_total or line_total will change
    if (partsTotalChanged || lineTotalChanged) {
      console.log('[saveEstimateItemParts] SYNC: Adding update promise for item', {
        itemId: item.id,
        updatePayload: {
          parts_total: newPartsTotal,
          line_total: newLineTotal,
        },
      })

      updatePromises.push(
        supabase
          .from('estimate_items')
          .update({
            parts_total: newPartsTotal,
            line_total: newLineTotal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id as string)
          .eq('tenant_id', tenantId)
          .then(r => r)
      )
    }
  }

  console.log('[saveEstimateItemParts] SYNC: Update promises created', {
    promiseCount: updatePromises.length,
  })

  if (updatePromises.length > 0) {
    console.log('[saveEstimateItemParts] SYNC: Executing updates', {
      count: updatePromises.length,
    })
    const results = await Promise.all(updatePromises)
    console.log('[saveEstimateItemParts] SYNC: Updates completed', {
      successCount: results.filter((r: any) => !r.error).length,
      errorCount: results.filter((r: any) => r.error).length,
    })
    for (const result of results) {
      if (result.error) {
        console.error('[saveEstimateItemParts] SYNC UPDATE FAILED:', result.error.message)
        return { error: result.error.message }
      }
    }
  } else {
    console.log('[saveEstimateItemParts] SYNC: No items needed updating')
  }

  // Recalculate estimate snapshot totals
  const recalcErr = await recalculateEstimateTotals(estimateId)
  if (recalcErr) {
    console.error('[saveEstimateItemParts] recalc totals:', recalcErr.error)
    return recalcErr
  }

  return null
}

/**
 * Appends one manual labor line from the tenant service catalog, with nested parts
 * and optional line notes. Does not replace existing items.
 */
export async function addServiceCatalogToEstimate(
  estimateId: string,
  catalogServiceId: string,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const estDenied = await denyUnlessCanEditDashboardModule('estimates')
  if (estDenied) return estDenied

  const admin = await createAdminClient()
  const tenantId = ctx.tenant.id
  const now = new Date().toISOString()

  const { data: catalog, error: catErr } = await admin
    .from('service_catalog')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', catalogServiceId)
    .eq('is_active', true)
    .maybeSingle()

  if (catErr || !catalog) {
    console.error('[addServiceCatalogToEstimate] catalog', catErr?.message)
    return { error: catErr?.message ?? 'Service not found' }
  }

  const { data: est, error: estErr } = await admin
    .from('estimates')
    .select('id, parts_markup_percent')
    .eq('tenant_id', tenantId)
    .eq('id', estimateId)
    .maybeSingle()

  if (estErr || !est) return { error: 'Estimate not found' }

  const pricingConfig = await getTenantPricingConfig(tenantId)
  const defaultLaborRate = Number(pricingConfig?.default_labor_rate ?? 0)

  const laborHours =
    catalog.default_labor_hours != null && !Number.isNaN(Number(catalog.default_labor_hours))
      ? Number(catalog.default_labor_hours)
      : 1
  const laborRate =
    catalog.default_labor_rate != null && !Number.isNaN(Number(catalog.default_labor_rate))
      ? Number(catalog.default_labor_rate)
      : defaultLaborRate

  const laborTotal = round2(laborHours * laborRate)
  const markupPct = Number(est.parts_markup_percent ?? 0)

  const { data: orderRow } = await admin
    .from('estimate_items')
    .select('display_order')
    .eq('tenant_id', tenantId)
    .eq('estimate_id', estimateId)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (typeof orderRow?.display_order === 'number' ? orderRow.display_order : -1) + 1

  let partsRaw: unknown = catalog.default_parts
  if (typeof partsRaw === 'string') {
    try {
      partsRaw = JSON.parse(partsRaw) as unknown
    } catch {
      partsRaw = []
    }
  }
  if (!Array.isArray(partsRaw)) partsRaw = []

  const { data: newItem, error: insErr } = await admin
    .from('estimate_items')
    .insert({
      tenant_id:       tenantId,
      estimate_id:     estimateId,
      source_type:     'manual',
      category:        'labor',
      title:           catalog.name,
      description:     catalog.description ?? null,
      service_job_id:  null,
      quantity:        1,
      unit_price:      0,
      labor_hours:     laborHours,
      labor_rate:      laborRate,
      labor_total:     laborTotal,
      parts_total:     0,
      line_total:      laborTotal,
      display_order:   nextOrder,
      needs_review:    false,
      notes:           catalog.default_notes ?? null,
      updated_at:      now,
    })
    .select('id')
    .single()

  if (insErr || !newItem) {
    console.error('[addServiceCatalogToEstimate] insert item', insErr?.message)
    return { error: insErr?.message ?? 'Failed to add line item' }
  }

  const itemId = newItem.id as string

  const partRows: {
    tenant_id: string
    estimate_id: string
    estimate_item_id: string
    name: string
    quantity: number
    unit_cost: number
    profit_amount: number
    unit_sell_price: number
    line_total: number
    display_order: number
    updated_at: string
  }[] = []

  ;(partsRaw as unknown[]).forEach((p, idx) => {
    if (!p || typeof p !== 'object') return
    const o = p as Record<string, unknown>
    const qty = Number(o.quantity ?? 1)
    const unitCost = round2(Number(o.unit_cost ?? 0))
    const unitSell = round2(unitCost * (1 + markupPct / 100))
    const profit = round2(unitSell - unitCost)
    const lineTotalPart = round2(qty * unitSell)
    partRows.push({
      tenant_id:        tenantId,
      estimate_id:      estimateId,
      estimate_item_id: itemId,
      name:             String(o.name ?? 'Part'),
      quantity:         qty,
      unit_cost:        unitCost,
      profit_amount:    profit,
      unit_sell_price:  unitSell,
      line_total:       lineTotalPart,
      display_order:    idx,
      updated_at:       now,
    })
  })

  if (partRows.length > 0) {
    const { error: pErr } = await admin.from('estimate_item_parts').insert(partRows)
    if (pErr) {
      console.error('[addServiceCatalogToEstimate] parts', pErr.message)
      await admin.from('estimate_items').delete().eq('id', itemId).eq('tenant_id', tenantId)
      return { error: pErr.message }
    }
  }

  const partsSum = round2(partRows.reduce((s, r) => s + r.line_total, 0))
  const lineTotalFull = round2(laborTotal + partsSum)

  const { error: upErr } = await admin
    .from('estimate_items')
    .update({
      parts_total: partsSum,
      line_total:  lineTotalFull,
      updated_at:  now,
    })
    .eq('id', itemId)
    .eq('tenant_id', tenantId)

  if (upErr) return { error: upErr.message }

  return recalculateEstimateTotals(estimateId)
}
