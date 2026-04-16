'use server'

import {
  getCurrentDashboardTenantUser,
  denyUnlessMayMutateInspection,
  canAssignOperationalTechnician,
} from '@/lib/auth/operational-assignment'
import { denyUnlessCanEditDashboardModule } from '@/lib/auth/roles'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getDashboardTenant } from '@/lib/tenant'
import type { ServiceRecommendation } from '@/lib/types'

// ── Archive result shape (shared by all three archive actions) ────────────────
// null  = success
// { error: string } = blocked or server failure — caller shows message in modal
export type ArchiveResult = { error: string } | null

// ── Create inspection ─────────────────────────────────────────────────────────

export async function createInspection(
  formData: FormData
): Promise<{ error: string } | { inspectionId: string }> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const inspDenied = await denyUnlessCanEditDashboardModule('inspections')
  if (inspDenied) return inspDenied

  const du = await getCurrentDashboardTenantUser()

  const supabase = await createClient()

  const vehicleId    = String(formData.get('vehicle_id')    ?? '').trim() || null
  const customerId   = String(formData.get('customer_id')   ?? '').trim() || null
  let templateId     = String(formData.get('template_id')   ?? '').trim() || null
  let technicianId   = String(formData.get('technician_id') ?? '').trim() || null
  if (du?.role === 'technician') {
    technicianId = du.tenantUserId
  }
  const notes        = String(formData.get('notes')         ?? '').trim() || null

  // Server-side fallback: If no template provided, use "Standard Vehicle Inspection"
  if (!templateId) {
    const { data: defaultTemplate } = await supabase
      .from('inspection_templates')
      .select('id')
      .eq('tenant_id', ctx.tenant.id)
      .eq('name', 'Standard Vehicle Inspection')
      .single()

    if (defaultTemplate) {
      templateId = defaultTemplate.id
    }
  }

  const { data, error } = await supabase.from('inspections').insert({
    tenant_id:     ctx.tenant.id,
    vehicle_id:    vehicleId,
    customer_id:   customerId,
    template_id:   templateId,
    technician_id: technicianId,
    status:        'draft',
    notes,
  }).select('id')

  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: 'Failed to create inspection' }

  return { inspectionId: data[0].id }
}

// ── Inspection lifecycle ──────────────────────────────────────────────────────

/**
 * Marks an inspection as completed and stamps completed_at.
 * The checklist becomes read-only in the UI after this.
 *
 * CRITICAL: Also generates service_recommendations for all Critical/Warning items.
 * This is the entry point for converting inspection findings into repair recommendations
 * that will later be imported into estimates.
 *
 * Flow:
 *   1. Mark inspection as completed
 *   2. Fetch all inspection_items for this inspection
 *   3. Filter for Critical (urgent) and Warning (attention) items
 *   4. Fetch inspection header for customer_id, vehicle_id
 *   5. Create service_recommendations for each flagged item
 *   6. If any inserts fail, log but don't block completion
 */
export async function completeInspection(
  inspectionId: string,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const inspDenied = await denyUnlessCanEditDashboardModule('inspections')
  if (inspDenied) return inspDenied

  const supabase = await createClient()
  const tenantId = ctx.tenant.id

  const assignDenied = await denyUnlessMayMutateInspection(inspectionId, tenantId)
  if (assignDenied) return assignDenied

  console.log('[completeInspection] starting', { inspectionId, tenantId })

  // ── Step 1: Mark inspection as completed ──────────────────────────────────
  const now = new Date().toISOString()
  const { error: completeErr } = await supabase
    .from('inspections')
    .update({
      status:       'completed',
      completed_at: now,
    })
    .eq('tenant_id', tenantId)
    .eq('id', inspectionId)

  if (completeErr) {
    console.error('[completeInspection] mark completed failed:', completeErr.message)
    return { error: completeErr.message }
  }

  console.log('[completeInspection] marked as completed')

  // ── Step 2: Fetch inspection header for context ──────────────────────────
  const { data: inspection, error: inspErr } = await supabase
    .from('inspections')
    .select('id, tenant_id, customer_id, vehicle_id')
    .eq('id', inspectionId)
    .single()

  if (inspErr || !inspection) {
    console.error('[completeInspection] fetch inspection failed:', inspErr?.message)
    // Don't fail completion — just skip recommendations
    return null
  }

  // ── Step 3: Fetch all inspection_items for this inspection ────────────────
  const { data: items, error: itemsErr } = await supabase
    .from('inspection_items')
    .select('id, template_item_id, result, note')
    .eq('inspection_id', inspectionId)

  if (itemsErr) {
    console.error('[completeInspection] fetch inspection_items failed:', itemsErr.message)
    // Don't fail completion — just skip recommendations
    return null
  }

  const allItems = items ?? []
  console.log('[completeInspection] inspection_items fetched', { count: allItems.length })

  // ── Step 4: Filter for Critical (urgent) and Warning (attention) items ────
  // DB values: 'pass' | 'attention' | 'urgent' | 'not_checked'
  // We create recommendations for: 'attention' (Warning) and 'urgent' (Critical)
  const flaggedItems = allItems.filter(
    item => item.result === 'attention' || item.result === 'urgent'
  )

  console.log('[completeInspection] flagged items found', {
    critical: allItems.filter(i => i.result === 'urgent').length,
    warning:  allItems.filter(i => i.result === 'attention').length,
    total: flaggedItems.length,
  })

  if (flaggedItems.length === 0) {
    console.log('[completeInspection] no flagged items, skipping recommendation creation')
    return null
  }

  // ── Step 5: Build service_recommendations rows ───────────────────────────
  // Fetch template items to get labels/names for recommendation titles
  const { data: templateItems, error: tplErr } = await supabase
    .from('inspection_template_items')
    .select('id, item_name, label, section_name')

  const templateMap = new Map<string, any>()
  if (!tplErr && templateItems) {
    for (const tpl of templateItems) {
      templateMap.set(tpl.id, tpl)
    }
  }

  const recommendations = flaggedItems.map(item => {
    const tpl = templateMap.get(item.template_item_id ?? '')
    const itemName = tpl?.item_name || tpl?.label || `Item ${item.id}`

    return {
      tenant_id:        tenantId,
      inspection_id:    inspectionId,
      inspection_item_id: item.id,
      customer_id:      inspection.customer_id ?? null,
      vehicle_id:       inspection.vehicle_id ?? null,
      title:            itemName,  // Use template label as title
      description:      item.note ?? null,  // Use technician notes as description
      recommendation_type: 'service',
      status:           'pending',
      priority:         item.result === 'urgent' ? 'high' : 'medium',  // urgent → high, attention → medium
      created_at:       now,
      updated_at:       now,
    }
  })

  console.log('[completeInspection] recommendation rows built', {
    count: recommendations.length,
    sample: recommendations[0],
  })

  // ── Step 6: Insert service_recommendations ───────────────────────────────
  if (recommendations.length > 0) {
    const { error: recErr, data: recData } = await supabase
      .from('service_recommendations')
      .insert(recommendations)
      .select('id, inspection_item_id, title')

    if (recErr) {
      console.error('[completeInspection] create recommendations failed:', recErr.message)
      // Non-fatal — inspection is already marked completed
      // Advisor can manually create recommendations if needed
    } else {
      console.log('[completeInspection] recommendations created successfully', {
        count: recData?.length ?? 0,
        ids: recData?.map(r => r.id) ?? [],
      })
    }
  }

  return null
}

/**
 * Re-opens a completed inspection back to in_progress.
 * Clears completed_at so the checklist becomes editable again.
 *
 * When reopening, we also archive (soft-delete) the service_recommendations
 * that were auto-generated on completion, so they can be regenerated when
 * the inspection is completed again.
 */
export async function reopenInspection(
  inspectionId: string,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const inspDenied = await denyUnlessCanEditDashboardModule('inspections')
  if (inspDenied) return inspDenied

  const supabase = await createClient()
  const tenantId = ctx.tenant.id

  const reopenAssignDenied = await denyUnlessMayMutateInspection(inspectionId, tenantId)
  if (reopenAssignDenied) return reopenAssignDenied

  console.log('[reopenInspection] starting', { inspectionId, tenantId })

  // ── Step 1: Mark inspection as in_progress ───────────────────────────────
  const { error: reopenErr } = await supabase
    .from('inspections')
    .update({
      status:       'in_progress',
      completed_at: null,
    })
    .eq('tenant_id', tenantId)
    .eq('id', inspectionId)

  if (reopenErr) {
    console.error('[reopenInspection] reopen failed:', reopenErr.message)
    return { error: reopenErr.message }
  }

  console.log('[reopenInspection] marked as in_progress')

  // ── Step 2: Delete recommendations that were auto-generated ────────────────
  // This allows them to be regenerated when the inspection is completed again.
  // We only delete recommendations that have NO linked estimate_items yet,
  // to avoid breaking estimates that may have already imported them.
  const { data: recsToDel, error: fetchErr } = await supabase
    .from('service_recommendations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('inspection_id', inspectionId)

  if (fetchErr) {
    console.error('[reopenInspection] fetch recommendations failed:', fetchErr.message)
    // Non-fatal — just log and continue
  } else if (recsToDel && recsToDel.length > 0) {
    // Check which recommendations have NO estimate_items linked to them yet
    const { data: linkedRecs, error: linkErr } = await supabase
      .from('estimate_items')
      .select('service_recommendation_id')
      .in('service_recommendation_id', recsToDel.map(r => r.id))
      .eq('tenant_id', tenantId)

    const linkedIds = new Set((linkedRecs ?? []).map(r => r.service_recommendation_id))
    const unlinkedIds = recsToDel.map(r => r.id).filter(id => !linkedIds.has(id))

    if (unlinkedIds.length > 0) {
      const { error: delErr } = await supabase
        .from('service_recommendations')
        .delete()
        .eq('tenant_id', tenantId)
        .in('id', unlinkedIds)

      if (delErr) {
        console.error('[reopenInspection] delete recommendations failed:', delErr.message)
      } else {
        console.log('[reopenInspection] recommendations deleted', {
          deleted: unlinkedIds.length,
          protected: linkedIds.size,  // Already imported into estimates, can't delete
        })
      }
    } else {
      console.log('[reopenInspection] all recommendations already linked to estimates, skipping delete')
    }
  }

  return null
}

// ── Recommendation decisions ──────────────────────────────────────────────────

export type RecommendationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'open'
  | 'approved'
  | 'declined'
  | 'completed'

/**
 * Updates a single recommendation's decision status.
 * Called optimistically from the checklist UI.
 */
export async function updateRecommendationStatus(
  recommendationId: string,
  status: RecommendationStatus,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const inspDenied = await denyUnlessCanEditDashboardModule('inspections')
  if (inspDenied) return inspDenied

  const supabase = await createClient()

  const { data: recRow, error: recFetchErr } = await supabase
    .from('service_recommendations')
    .select('inspection_id')
    .eq('tenant_id', ctx.tenant.id)
    .eq('id', recommendationId)
    .maybeSingle()

  if (recFetchErr || !recRow) {
    return { error: recFetchErr?.message ?? 'Recommendation not found.' }
  }

  if (recRow.inspection_id) {
    const recDenied = await denyUnlessMayMutateInspection(recRow.inspection_id as string, ctx.tenant.id)
    if (recDenied) return recDenied
  } else {
    const du = await getCurrentDashboardTenantUser()
    if (du?.role === 'technician') {
      return { error: 'Not authorized' }
    }
  }

  const { error } = await supabase
    .from('service_recommendations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('tenant_id', ctx.tenant.id)
    .eq('id', recommendationId)

  if (error) {
    console.error('[updateRecommendationStatus]', error.message)
    return { error: error.message }
  }

  return null
}

// ── Recommendation title + description lookup ─────────────────────────────────
//    Keys are lowercase. Fallback: "Inspect/service: <label>"

const TITLE_MAP: Record<string, string> = {
  'brake pads':             'Replace brake pads',
  'brake rotors':           'Inspect / replace brake rotors',
  'brake fluid':            'Brake fluid service',
  'air cabin filter':       'Replace cabin air filter',
  'cabin air filter':       'Replace cabin air filter',
  'engine air filter':      'Replace engine air filter',
  'air filter':             'Replace air filter',
  'spark plugs':            'Replace spark plugs',
  'spark plug wire set':    'Replace spark plug wire set',
  'tune up':                'Tune up service',
  'oil leak':               'Diagnose / repair oil leak',
  'check engine light':     'Check engine diagnostic',
  'control arms':           'Replace control arms',
  'sway bar links':         'Replace sway bar links',
  'struts/shocks':          'Replace struts / shocks',
  'struts shocks':          'Replace struts / shocks',
  'struts':                 'Replace struts / shocks',
  'shocks':                 'Replace struts / shocks',
  'ball joints':            'Replace ball joints',
  'tie rods':               'Replace tie rods',
  'cv axle':                'Replace CV axle',
  'rack and pinion':        'Inspect / replace rack and pinion',
  'transmission fluid':     'Transmission fluid service',
  'transmission service':   'Transmission service',
  'coolant flush':          'Coolant flush service',
  'power steering fluid':   'Power steering fluid service',
  'differential fluid':     'Differential fluid service',
  'battery':                'Inspect / replace battery',
  'alternator':             'Inspect / replace alternator',
  'belts':                  'Inspect / replace belts',
  'timing belt':            'Replace timing belt',
  'serpentine belt':        'Replace serpentine belt',
  'hoses':                  'Inspect / replace hoses',
  'wipers':                 'Replace wiper blades',
  'wiper blades':           'Replace wiper blades',
  'tires':                  'Inspect / replace tires',
  'tire rotation':          'Tire rotation',
  'wheel alignment':        'Wheel alignment',
  'wheel bearings':         'Replace wheel bearings',
  'exhaust':                'Inspect / repair exhaust system',
  'catalytic converter':    'Inspect / replace catalytic converter',
  'oxygen sensor':          'Replace oxygen sensor',
  'fuel filter':            'Replace fuel filter',
  'fuel injectors':         'Fuel injector service',
  'ac recharge':            'AC recharge service',
  'ac compressor':          'Inspect / replace AC compressor',
  'heater core':            'Inspect / replace heater core',
}

function deriveTitle(label: string): string {
  const key = label.toLowerCase().trim()
  return TITLE_MAP[key] ?? `Inspect / service: ${label}`
}

function deriveDescription(status: 'attention' | 'urgent'): string {
  return status === 'urgent'
    ? 'Immediate repair recommended. Continued driving may cause damage or safety risk.'
    : 'Wear detected. Service recommended soon to prevent further damage.'
}

// ── Save DVI results + auto-generate recommendations ─────────────────────────

export interface InspectionResultItem {
  template_item_id: string
  status: 'pass' | 'attention' | 'urgent' | 'not_checked'
  notes: string | null
  /** Display label — used to derive recommendation titles without an extra query */
  label?: string
}

/**
 * Persists DVI checklist results and auto-manages service recommendations.
 *
 * "Save Results" is a progress save — it does NOT complete the inspection.
 * Use completeInspection() to explicitly finalize.
 *
 * Recommendation status is preserved on re-save: if a tech already accepted
 * a recommendation, saving again won't reset it to 'pending'.
 *
 * Flow:
 *  1. Guard: skip if inspection is already completed
 *  2. Update existing inspection_items in place (preserves IDs → photos stay linked)
 *     Insert only rows that are genuinely new (no existing row for that template_item_id)
 *  3. Re-fetch inspection_items     to get DB-assigned IDs for the FK
 *  4. Fetch inspection header       for vehicle_id / customer_id
 *  5. Fetch existing recommendations to preserve their status on update
 *  6. INSERT new recommendations    (status = 'pending')
 *  7. UPDATE existing recommendations (title/description/priority only — preserve status)
 *  8. DELETE recommendations         for items cleared to OK / N/C
 *  9. Update inspection aggregates   (total_items, critical_count, warning_count)
 *     Status is set to 'in_progress' — never auto-completed here.
 *
 * Required DB migrations (run once in Supabase SQL editor):
 *
 *   ALTER TABLE inspections
 *     ADD COLUMN IF NOT EXISTS total_items    integer DEFAULT 0,
 *     ADD COLUMN IF NOT EXISTS critical_count integer DEFAULT 0,
 *     ADD COLUMN IF NOT EXISTS warning_count  integer DEFAULT 0;
 *
 *   ALTER TABLE inspection_items
 *     ADD CONSTRAINT inspection_items_inspection_template_unique
 *     UNIQUE (inspection_id, template_item_id);
 *
 *   ALTER TABLE service_recommendations
 *     ADD COLUMN IF NOT EXISTS inspection_item_id  uuid REFERENCES inspection_items(id) ON DELETE CASCADE,
 *     ADD COLUMN IF NOT EXISTS template_item_id    uuid,
 *     ADD COLUMN IF NOT EXISTS estimated_price     numeric(10,2),
 *     ADD COLUMN IF NOT EXISTS item_name           text,
 *     ADD COLUMN IF NOT EXISTS source_status       text,
 *     ADD COLUMN IF NOT EXISTS technician_notes    text,
 *     ADD COLUMN IF NOT EXISTS section_name        text,
 *     ADD COLUMN IF NOT EXISTS updated_at          timestamptz DEFAULT now();
 *
 *   ALTER TABLE service_recommendations
 *     ADD CONSTRAINT service_recommendations_inspection_item_unique
 *     UNIQUE (inspection_item_id);
 */
export async function saveInspectionResults(
  inspectionId: string,
  items: InspectionResultItem[],
): Promise<{ error: string } | null> {
  if (!inspectionId || items.length === 0) {
    return { error: 'Nothing to save.' }
  }

  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const inspDenied = await denyUnlessCanEditDashboardModule('inspections')
  if (inspDenied) return inspDenied

  const supabase = await createClient()
  const tenantId = ctx.tenant.id

  const saveAssignDenied = await denyUnlessMayMutateInspection(inspectionId, tenantId)
  if (saveAssignDenied) return saveAssignDenied

  // ── 1. Guard: don't overwrite a completed inspection ─────────────────────
  const { data: inspCheck } = await supabase
    .from('inspections')
    .select('status, vehicle_id, customer_id')
    .eq('tenant_id', tenantId)
    .eq('id', inspectionId)
    .single()

  if (inspCheck?.status === 'completed') {
    return { error: 'This inspection is completed. Use "Edit Inspection" to reopen it first.' }
  }

  const vehicleId  = inspCheck?.vehicle_id  ?? null
  const customerId = inspCheck?.customer_id ?? null

  // ── 2. Update existing inspection_items in place (preserve IDs for photos) ─
  //
  // Upsert was replaced with an explicit fetch → update/insert pattern so that
  // inspection_items.id is never changed. Stable IDs are required to keep
  // inspection_item_photos linked correctly.
  // Must use adminClient — inspection_items has RLS that silently returns []
  // for the regular client, which would cause every item to be INSERTed as a
  // new row (new ID) on every save, breaking inspection_item_photos links.
  const adminSupabase = createAdminClient()
  const { data: existingItems, error: fetchExistingError } = await adminSupabase
    .from('inspection_items')
    .select('id, template_item_id')
    .eq('inspection_id', inspectionId)

  if (fetchExistingError) {
    console.error('[saveInspectionResults] fetch existing items:', fetchExistingError.message)
    return { error: fetchExistingError.message }
  }

  const existingMap = new Map(
    (existingItems ?? []).map(i => [i.template_item_id, i.id])
  )

  console.log('[SAVE FIX]', {
    existingCount: existingItems?.length ?? 0,
    savingCount:   items.length,
  })

  for (const item of items) {
    const existingId = existingMap.get(item.template_item_id)

    if (existingId) {
      const { error: updateError } = await supabase
        .from('inspection_items')
        .update({
          result: item.status,
          note:   item.notes ?? null,
        })
        .eq('id', existingId)

      if (updateError) {
        console.error('[saveInspectionResults] update item:', updateError.message)
        return { error: updateError.message }
      }
    } else {
      const { error: insertError } = await supabase
        .from('inspection_items')
        .insert({
          tenant_id:        tenantId,
          inspection_id:    inspectionId,
          template_item_id: item.template_item_id,
          result:           item.status,
          note:             item.notes ?? null,
        })

      if (insertError) {
        console.error('[saveInspectionResults] insert item:', insertError.message)
        return { error: insertError.message }
      }
    }
  }

  // ── 3. Re-fetch inspection_items to get DB-assigned IDs ───────────────────
  const templateItemIds = items.map(i => i.template_item_id)

  const { data: savedItems, error: fetchItemsError } = await supabase
    .from('inspection_items')
    .select('id, template_item_id, result')
    .eq('tenant_id', tenantId)
    .eq('inspection_id', inspectionId)
    .in('template_item_id', templateItemIds)

  if (fetchItemsError) {
    console.error('[saveInspectionResults] fetch items:', fetchItemsError.message)
    return { error: fetchItemsError.message }
  }

  // template_item_id → { id, result }
  const savedItemMap = new Map<string, { id: string; result: string }>(
    (savedItems ?? []).map(r => [
      r.template_item_id as string,
      { id: r.id as string, result: r.result as string },
    ])
  )

  // ── 4. Separate items into flagged (attention/urgent) vs cleared ──────────
  type FlaggedItem = {
    inspection_item_id: string
    label:              string
    notes:              string | null
    itemStatus:         'attention' | 'urgent'
  }

  const flaggedItems:   FlaggedItem[] = []
  const clearedItemIds: string[]      = []

  for (const item of items) {
    const saved = savedItemMap.get(item.template_item_id)
    if (!saved) continue

    if (item.status === 'attention' || item.status === 'urgent') {
      flaggedItems.push({
        inspection_item_id: saved.id,
        label:              (item.label ?? item.template_item_id).trim(),
        notes:              item.notes ?? null,
        itemStatus:         item.status,
      })
    } else {
      clearedItemIds.push(saved.id)
    }
  }

  // ── 5. Fetch existing recommendations to preserve their decision status ───
  const flaggedItemIds = flaggedItems.map(f => f.inspection_item_id)

  const existingRecMap = new Map<string, { id: string; status: string }>()

  if (flaggedItemIds.length > 0) {
    const { data: existingRecs } = await supabase
      .from('service_recommendations')
      .select('id, inspection_item_id, status')
      .eq('inspection_id', inspectionId)
      .in('inspection_item_id', flaggedItemIds)

    for (const rec of existingRecs ?? []) {
      if (rec.inspection_item_id) {
        existingRecMap.set(rec.inspection_item_id as string, {
          id:     rec.id as string,
          status: rec.status as string,
        })
      }
    }
  }

  const now = new Date().toISOString()

  // ── 6. INSERT new recommendations (status = 'pending') ───────────────────
  const recsToInsert = flaggedItems
    .filter(f => !existingRecMap.has(f.inspection_item_id))
    .map(f => ({
      tenant_id:          tenantId,
      inspection_id:      inspectionId,
      inspection_item_id: f.inspection_item_id,
      vehicle_id:         vehicleId,
      customer_id:        customerId,
      title:              deriveTitle(f.label),
      description:        deriveDescription(f.itemStatus),
      item_name:          f.label,
      source_status:      f.itemStatus,
      technician_notes:   f.notes,
      priority:           f.itemStatus === 'urgent' ? 'high' : 'medium',
      status:             'pending',
      estimated_price:    null,
      updated_at:         now,
    }))

  if (recsToInsert.length > 0) {
    const { error: insertRecsError } = await supabase
      .from('service_recommendations')
      .insert(recsToInsert)

    if (insertRecsError) {
      console.error('[saveInspectionResults] insert recs:', insertRecsError.message)
      return { error: insertRecsError.message }
    }
  }

  // ── 7. UPDATE existing recommendations (preserve status, update metadata) ─
  const recsToUpdate = flaggedItems.filter(f => existingRecMap.has(f.inspection_item_id))

  for (const f of recsToUpdate) {
    const existing = existingRecMap.get(f.inspection_item_id)!
    const { error: updateRecError } = await supabase
      .from('service_recommendations')
      .update({
        title:            deriveTitle(f.label),
        description:      deriveDescription(f.itemStatus),
        item_name:        f.label,
        source_status:    f.itemStatus,
        technician_notes: f.notes,
        priority:         f.itemStatus === 'urgent' ? 'high' : 'medium',
        updated_at:       now,
        // status intentionally NOT updated — preserve whatever decision was made
      })
      .eq('tenant_id', tenantId)
      .eq('id', existing.id)

    if (updateRecError) {
      console.error('[saveInspectionResults] update rec:', updateRecError.message)
      // Non-fatal — continue
    }
  }

  // ── 8. DELETE recommendations for cleared items ───────────────────────────
  if (clearedItemIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('service_recommendations')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('inspection_id', inspectionId)
      .in('inspection_item_id', clearedItemIds)

    if (deleteError) {
      console.error('[saveInspectionResults] delete recs:', deleteError.message)
      // Non-fatal
    }
  }

  // ── 9. Update inspection aggregates — always in_progress on save ──────────
  const totalItems    = items.length
  const criticalCount = items.filter(i => i.status === 'urgent').length
  const warningCount  = items.filter(i => i.status === 'attention').length

  const { error: updateError } = await supabase
    .from('inspections')
    .update({
      total_items:    totalItems,
      critical_count: criticalCount,
      warning_count:  warningCount,
      status:         'in_progress',
      updated_at:     now,
    })
    .eq('tenant_id', tenantId)
    .eq('id', inspectionId)

  if (updateError) {
    console.error('[saveInspectionResults] update inspection:', updateError.message)
    return { error: updateError.message }
  }

  return null
}

// ── Create a single inspection_items row (used by photo upload on new items) ──

/**
 * Ensures an inspection_items row exists for the given template item.
 * If a row already exists (race condition / double-tap), returns its id.
 * Uses the admin client so RLS never silently blocks the insert or the guard read.
 */
export async function createInspectionItemRow(
  inspectionId:   string,
  templateItemId: string,
  status:         string,
  notes:          string | null,
): Promise<{ id: string } | { error: string }> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const inspDenied = await denyUnlessCanEditDashboardModule('inspections')
  if (inspDenied) return inspDenied

  const rowDenied = await denyUnlessMayMutateInspection(inspectionId, ctx.tenant.id)
  if (rowDenied) return rowDenied

  const tenantId    = ctx.tenant.id
  const adminClient = createAdminClient()

  // Guard: return existing row id if it already exists
  const { data: existing } = await adminClient
    .from('inspection_items')
    .select('id')
    .eq('inspection_id', inspectionId)
    .eq('template_item_id', templateItemId)
    .maybeSingle()

  if (existing?.id) return { id: existing.id }

  const { data, error } = await adminClient
    .from('inspection_items')
    .insert({
      tenant_id:        tenantId,
      inspection_id:    inspectionId,
      template_item_id: templateItemId,
      result:           status || 'not_checked',
      note:             notes ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createInspectionItemRow]', error.message)
    return { error: error.message }
  }

  return { id: data.id }
}

// ── Generate recommendations (standalone) ────────────────────────────────────

/**
 * Reads saved inspection_items and upserts service_recommendations for every
 * attention / urgent item.  Clears recommendations for items that are now
 * pass / not_checked.
 *
 * This is the standalone "Generate Recommendations" action — it works on
 * whatever is currently in the DB, independently of the save flow.
 * Call it after the checklist has been saved at least once.
 *
 * Behaviour:
 *  - New flagged items → INSERT recommendation (status = 'pending')
 *  - Already-existing recs → UPDATE metadata, preserve status
 *  - Items now cleared → DELETE their recommendation
 *  - Returns null on success, { error } on failure
 */
export async function generateRecommendations(
  inspectionId: string,
): Promise<{ error: string } | null> {
  if (!inspectionId) return { error: 'Missing inspection ID.' }

  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const inspDenied = await denyUnlessCanEditDashboardModule('inspections')
  if (inspDenied) return inspDenied

  const supabase      = await createClient()
  const adminSupabase = createAdminClient()
  const tenantId      = ctx.tenant.id

  const genDenied = await denyUnlessMayMutateInspection(inspectionId, tenantId)
  if (genDenied) return genDenied

  // ── 1. Fetch inspection header (vehicle / customer IDs) ───────────────────
  const { data: inspection, error: inspError } = await supabase
    .from('inspections')
    .select('id, vehicle_id, customer_id, template_id')
    .eq('tenant_id', tenantId)
    .eq('id', inspectionId)
    .single()

  if (inspError || !inspection) {
    return { error: inspError?.message ?? 'Inspection not found.' }
  }

  // ── 2. Fetch inspection_items via admin client (bypasses RLS) ─────────────
  type RawInspItem = {
    id:               string
    template_item_id: string | null
    result:           string | null
    note:             string | null
  }

  const { data: rawInspItems, error: itemsError } = await adminSupabase
    .from('inspection_items')
    .select('id, template_item_id, result, note')
    .eq('inspection_id', inspectionId)

  if (itemsError) {
    console.error('[generateRecommendations] fetch items:', itemsError.message)
    return { error: itemsError.message }
  }

  if (!rawInspItems || rawInspItems.length === 0) {
    return { error: 'No saved inspection items found. Save the checklist first.' }
  }

  const inspItems = rawInspItems as RawInspItem[]

  // ── 3. Fetch template items for label + section_name lookup ───────────────
  const templateItemIds = inspItems
    .map(i => i.template_item_id)
    .filter((id): id is string => id != null)

  const templateMap = new Map<string, { label: string; section_name: string | null }>()

  if (templateItemIds.length > 0) {
    const { data: tplItems } = await supabase
      .from('inspection_template_items')
      .select('id, label, item_name, section_name, section, category')
      .in('id', templateItemIds)

    for (const ti of tplItems ?? []) {
      const label        = (ti.label || ti.item_name || ti.id).trim()
      const section_name = ti.section_name?.trim() || ti.section?.trim() || ti.category?.trim() || null
      templateMap.set(ti.id as string, { label, section_name })
    }
  }

  // ── 4. Separate flagged vs cleared items ──────────────────────────────────
  const flaggedItems = inspItems.filter(
    i => i.result === 'attention' || i.result === 'urgent',
  )
  const clearedItemIds = inspItems
    .filter(i => i.result === 'pass' || i.result === 'not_checked')
    .map(i => i.id)

  // If nothing is flagged, clean up any stale recs and return
  if (flaggedItems.length === 0) {
    if (clearedItemIds.length > 0) {
      await supabase
        .from('service_recommendations')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('inspection_id', inspectionId)
    }
    return null
  }

  // ── 5. Fetch existing recommendations to preserve their status ────────────
  const flaggedItemIds = flaggedItems.map(i => i.id)

  const existingRecMap = new Map<string, { id: string; status: string }>()

  const { data: existingRecs } = await supabase
    .from('service_recommendations')
    .select('id, inspection_item_id, status')
    .eq('inspection_id', inspectionId)
    .in('inspection_item_id', flaggedItemIds)

  for (const rec of existingRecs ?? []) {
    if (rec.inspection_item_id) {
      existingRecMap.set(rec.inspection_item_id as string, {
        id:     rec.id     as string,
        status: rec.status as string,
      })
    }
  }

  const now = new Date().toISOString()

  // ── 6. INSERT new recommendations ─────────────────────────────────────────
  const recsToInsert = flaggedItems
    .filter(f => !existingRecMap.has(f.id))
    .map(f => {
      const tpl    = templateMap.get(f.template_item_id ?? '')
      const label  = tpl?.label ?? (f.template_item_id ?? f.id)
      const status = f.result as 'attention' | 'urgent'
      return {
        tenant_id:          tenantId,
        inspection_id:      inspectionId,
        inspection_item_id: f.id,
        template_item_id:   f.template_item_id,
        vehicle_id:         inspection.vehicle_id,
        customer_id:        inspection.customer_id,
        title:              deriveTitle(label),
        description:        deriveDescription(status),
        item_name:          label,
        source_status:      status,
        technician_notes:   f.note ?? null,
        section_name:       tpl?.section_name ?? null,
        priority:           status === 'urgent' ? 'high' : 'medium',
        status:             'pending',
        estimated_price:    null,
        updated_at:         now,
      }
    })

  if (recsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('service_recommendations')
      .insert(recsToInsert)

    if (insertError) {
      console.error('[generateRecommendations] insert:', insertError.message)
      return { error: insertError.message }
    }
  }

  // ── 7. UPDATE existing recommendations (preserve status) ─────────────────
  const recsToUpdate = flaggedItems.filter(f => existingRecMap.has(f.id))

  for (const f of recsToUpdate) {
    const existing = existingRecMap.get(f.id)!
    const tpl      = templateMap.get(f.template_item_id ?? '')
    const label    = tpl?.label ?? (f.template_item_id ?? f.id)
    const status   = f.result as 'attention' | 'urgent'

    const { error: updateError } = await supabase
      .from('service_recommendations')
      .update({
        title:            deriveTitle(label),
        description:      deriveDescription(status),
        item_name:        label,
        source_status:    status,
        technician_notes: f.note ?? null,
        section_name:     tpl?.section_name ?? null,
        priority:         status === 'urgent' ? 'high' : 'medium',
        updated_at:       now,
        // status intentionally NOT updated — preserve the tech's decision
      })
      .eq('tenant_id', tenantId)
      .eq('id', existing.id)

    if (updateError) {
      console.error('[generateRecommendations] update rec:', updateError.message)
      // Non-fatal
    }
  }

  // ── 8. DELETE recommendations for cleared items ───────────────────────────
  if (clearedItemIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('service_recommendations')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('inspection_id', inspectionId)
      .in('inspection_item_id', clearedItemIds)

    if (deleteError) {
      console.error('[generateRecommendations] delete recs:', deleteError.message)
      // Non-fatal
    }
  }

  return null
}

// ── archiveInspection ─────────────────────────────────────────────────────────

/**
 * Soft-archives an inspection record.
 *
 * Blocker: if the inspection has at least one linked active (non-archived)
 * estimate, the archive is blocked. The estimate must be voided first.
 *
 * Validation: if reason === 'other', note is required.
 *
 * Returns null on success, { error } on any blocker or failure.
 */
export async function archiveInspection(
  inspectionId: string,
  reason:       string,
  note?:        string,
): Promise<ArchiveResult> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authenticated' }

  const archiveInspDenied = await denyUnlessCanEditDashboardModule('inspections')
  if (archiveInspDenied) return archiveInspDenied

  const archiveAssignDenied = await denyUnlessMayMutateInspection(inspectionId, ctx.tenant.id)
  if (archiveAssignDenied) return archiveAssignDenied

  // ── Validate reason / note constraint ───────────────────────────────────
  if (!reason?.trim()) {
    return { error: 'A reason is required to archive an inspection.' }
  }
  if (reason === 'other' && !note?.trim()) {
    return { error: 'A note is required when the reason is "Other".' }
  }

  const tenantId   = ctx.tenant.id
  const supabase   = await createClient()
  const adminClient = createAdminClient()

  // ── Resolve current auth user for audit column ───────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  const archivedBy = user?.id ?? null

  // ── Blocker: check for linked active estimates ───────────────────────────
  // An active estimate depends on this inspection. The estimate must be
  // voided (archived) before the inspection can be archived.
  const { data: linkedEstimate, error: linkErr } = await adminClient
    .from('estimates')
    .select('id, estimate_number')
    .eq('tenant_id', tenantId)
    .eq('inspection_id', inspectionId)
    .eq('is_archived', false)
    .limit(1)
    .maybeSingle()

  if (linkErr) {
    console.error('[archiveInspection] blocker check:', linkErr.message)
    return { error: `Could not verify linked estimates: ${linkErr.message}` }
  }

  if (linkedEstimate) {
    const label = linkedEstimate.estimate_number || linkedEstimate.id
    return {
      error: `Cannot archive: this inspection is linked to active estimate ${label}. Void the estimate first.`,
    }
  }

  // ── Archive the inspection ───────────────────────────────────────────────
  const now = new Date().toISOString()

  const { error: updateErr } = await adminClient
    .from('inspections')
    .update({
      is_archived:    true,
      archived_at:    now,
      archived_by:    archivedBy,
      archive_reason: reason.trim(),
      archive_note:   note?.trim() || null,
      updated_at:     now,
    })
    .eq('id', inspectionId)
    .eq('tenant_id', tenantId)   // tenant isolation: silently no-ops if mismatch

  if (updateErr) {
    console.error('[archiveInspection] update:', updateErr.message)
    return { error: `Failed to archive inspection: ${updateErr.message}` }
  }

  return null
}

// ── Assign technician (advisor / admin only) ─────────────────────────────────

export async function setInspectionTechnician(
  inspectionId:           string,
  technicianTenantUserId: string | null,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const du = await getCurrentDashboardTenantUser()
  if (!du || !canAssignOperationalTechnician(du.role)) {
    return { error: 'Not authorized' }
  }

  const tenantId    = ctx.tenant.id
  const adminClient = createAdminClient()

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
    .from('inspections')
    .update({
      technician_id: technicianTenantUserId,
      updated_at:    new Date().toISOString(),
    })
    .eq('id', inspectionId)
    .eq('tenant_id', tenantId)

  if (error) return { error: error.message }
  return null
}
