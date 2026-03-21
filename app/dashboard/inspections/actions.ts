'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getDashboardTenant } from '@/lib/tenant'
import type { ServiceRecommendation } from '@/lib/types'

// ── Create inspection ─────────────────────────────────────────────────────────

export async function createInspection(
  formData: FormData
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const supabase = await createClient()

  const vehicleId    = String(formData.get('vehicle_id')    ?? '').trim() || null
  const customerId   = String(formData.get('customer_id')   ?? '').trim() || null
  const templateId   = String(formData.get('template_id')   ?? '').trim() || null
  const technicianId = String(formData.get('technician_id') ?? '').trim() || null
  const notes        = String(formData.get('notes')         ?? '').trim() || null

  const { error } = await supabase.from('inspections').insert({
    tenant_id:     ctx.tenant.id,
    vehicle_id:    vehicleId,
    customer_id:   customerId,
    template_id:   templateId,
    technician_id: technicianId,
    status:        'draft',
    notes,
  })

  if (error) return { error: error.message }
  return null
}

// ── Inspection lifecycle ──────────────────────────────────────────────────────

/**
 * Marks an inspection as completed and stamps completed_at.
 * The checklist becomes read-only in the UI after this.
 */
export async function completeInspection(
  inspectionId: string,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('inspections')
    .update({
      status:       'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('tenant_id', ctx.tenant.id)
    .eq('id', inspectionId)

  if (error) {
    console.error('[completeInspection]', error.message)
    return { error: error.message }
  }

  return null
}

/**
 * Re-opens a completed inspection back to in_progress.
 * Clears completed_at so the checklist becomes editable again.
 */
export async function reopenInspection(
  inspectionId: string,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('inspections')
    .update({
      status:       'in_progress',
      completed_at: null,
    })
    .eq('tenant_id', ctx.tenant.id)
    .eq('id', inspectionId)

  if (error) {
    console.error('[reopenInspection]', error.message)
    return { error: error.message }
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

  const supabase = await createClient()

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
    ? 'Critical issue requiring immediate attention. Do not delay service.'
    : 'Requires attention. Recommend addressing on next service visit.'
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
 *  2. Upsert inspection_items       (conflict: inspection_id, template_item_id)
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

  const supabase = await createClient()
  const tenantId = ctx.tenant.id

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

  // ── 2. Upsert inspection_items ────────────────────────────────────────────
  const itemRows = items.map(item => ({
    tenant_id:        tenantId,
    inspection_id:    inspectionId,
    template_item_id: item.template_item_id,
    status:           item.status,
    notes:            item.notes ?? null,
  }))

  const { error: upsertError } = await supabase
    .from('inspection_items')
    .upsert(itemRows, { onConflict: 'inspection_id,template_item_id' })

  if (upsertError) {
    console.error('[saveInspectionResults] upsert items:', upsertError.message)
    return { error: upsertError.message }
  }

  // ── 3. Re-fetch inspection_items to get DB-assigned IDs ───────────────────
  const templateItemIds = items.map(i => i.template_item_id)

  const { data: savedItems, error: fetchItemsError } = await supabase
    .from('inspection_items')
    .select('id, template_item_id, status')
    .eq('tenant_id', tenantId)
    .eq('inspection_id', inspectionId)
    .in('template_item_id', templateItemIds)

  if (fetchItemsError) {
    console.error('[saveInspectionResults] fetch items:', fetchItemsError.message)
    return { error: fetchItemsError.message }
  }

  // template_item_id → { id, status }
  const savedItemMap = new Map<string, { id: string; status: string }>(
    (savedItems ?? []).map(r => [
      r.template_item_id as string,
      { id: r.id as string, status: r.status as string },
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

  const supabase      = await createClient()
  const adminSupabase = createAdminClient()
  const tenantId      = ctx.tenant.id

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
  const { data: inspItems, error: itemsError } = await adminSupabase
    .from('inspection_items')
    .select('id, template_item_id, status, notes')
    .eq('inspection_id', inspectionId)

  if (itemsError) {
    console.error('[generateRecommendations] fetch items:', itemsError.message)
    return { error: itemsError.message }
  }

  if (!inspItems || inspItems.length === 0) {
    return { error: 'No saved inspection items found. Save the checklist first.' }
  }

  // ── 3. Fetch template items for label + section_name lookup ───────────────
  const templateItemIds = (inspItems ?? [])
    .map(i => i.template_item_id)
    .filter(Boolean) as string[]

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
  const flaggedItems = (inspItems ?? []).filter(
    i => i.status === 'attention' || i.status === 'urgent',
  )
  const clearedItemIds = (inspItems ?? [])
    .filter(i => i.status === 'pass' || i.status === 'not_checked')
    .map(i => i.id as string)

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
  const flaggedItemIds = flaggedItems.map(i => i.id as string)

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
    .filter(f => !existingRecMap.has(f.id as string))
    .map(f => {
      const tpl    = templateMap.get(f.template_item_id as string)
      const label  = tpl?.label ?? (f.template_item_id as string)
      const status = f.status as 'attention' | 'urgent'
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
        technician_notes:   f.notes ?? null,
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
  const recsToUpdate = flaggedItems.filter(f => existingRecMap.has(f.id as string))

  for (const f of recsToUpdate) {
    const existing = existingRecMap.get(f.id as string)!
    const tpl      = templateMap.get(f.template_item_id as string)
    const label    = tpl?.label ?? (f.template_item_id as string)
    const status   = f.status as 'attention' | 'urgent'

    const { error: updateError } = await supabase
      .from('service_recommendations')
      .update({
        title:            deriveTitle(label),
        description:      deriveDescription(status),
        item_name:        label,
        source_status:    status,
        technician_notes: f.notes ?? null,
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
