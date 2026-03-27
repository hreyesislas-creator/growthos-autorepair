'use server'

import { createClient } from '@/lib/supabase/server'
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

  const supabase   = await createClient()
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

  // 2. Bucket subtotals.
  //    RULE: Tax applies to PARTS ONLY — labor is never taxed.
  //    Job-mode items carry both labor and parts costs; split them here so tax
  //    is only applied to the parts portion regardless of the item's category.
  let subtotalLabor = 0
  let subtotalParts = 0
  let subtotalOther = 0

  for (const item of items ?? []) {
    if (item.service_job_id) {
      // Job mode: labor_total / parts_total are stored separately on the item.
      subtotalLabor += Number(item.labor_total ?? 0)
      subtotalParts += Number(item.parts_total ?? 0)
    } else {
      const amount = Number(item.line_total) || 0
      if (item.category === 'labor') subtotalLabor += amount
      else if (item.category === 'part') subtotalParts += amount
      else subtotalOther += amount
    }
  }

  const subtotalLabor2 = round2(subtotalLabor)
  const subtotalParts2 = round2(subtotalParts)
  const subtotalOther2 = round2(subtotalOther)
  const subtotal       = round2(subtotalLabor2 + subtotalParts2 + subtotalOther2)

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

  // 5. Write back to the estimate header
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
    console.error('[recalculateEstimateTotals] update:', updateErr.message)
    return { error: updateErr.message }
  }

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
    // 'part'/'parts' are NOT mapped to 'part' — top-level part items are
    // disallowed in the editor.  Part-type recommendations come in as 'misc'
    // so the advisor can decide where to place them.
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

  const [estimateNumber, pricingConfig] = await Promise.all([
    buildEstimateNumber(supabase, tenantId),
    getTenantPricingConfig(tenantId),
  ])

  // Pre-fill rates from the tenant's defaults if configured.
  // tax_amount starts at 0 because the estimate has no line items yet;
  // recalculateEstimateTotals() will compute it correctly once items are saved.
  const defaultTaxRate     = pricingConfig?.default_tax_rate     ?? null
  const defaultMarkupPct   = pricingConfig?.parts_markup_percent ?? 0

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
): Promise<{ data: EstimateItem[] } | { error: string }> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

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

  const supabase = await createClient()
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

  const supabase = await createClient()
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

  return null
}
