'use server'

import { createClient } from '@/lib/supabase/server'
import { getDashboardTenant } from '@/lib/tenant'

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
    .update({ status })
    .eq('tenant_id', ctx.tenant.id)
    .eq('id', recommendationId)

  if (error) {
    console.error('[updateRecommendationStatus]', error.message)
    return { error: error.message }
  }

  return null
}

// ── Save DVI results + auto-generate recommendations ─────────────────────────

export interface InspectionResultItem {
  template_item_id: string
  status: 'pass' | 'attention' | 'urgent' | 'not_checked'
  notes: string | null
  /** Display label — used to derive recommendation titles without an extra query */
  label?: string
}

// ── Recommendation title lookup ───────────────────────────────────────────────
//    Keys are lowercase. Fallback: "Inspect/service: <label>"

const TITLE_MAP: Record<string, string> = {
  'brake pads':             'Replace brake pads',
  'brake rotors':           'Inspect/replace brake rotors',
  'brake fluid':            'Brake fluid service',
  'air cabin filter':       'Replace cabin air filter',
  'cabin air filter':       'Replace cabin air filter',
  'spark plugs':            'Replace spark plugs',
  'spark plug wire set':    'Replace spark plug wire set',
  'tune up':                'Perform tune up',
  'oil leak':               'Diagnose oil leak',
  'check engine light':     'Diagnostic scan',
  'control arms':           'Replace control arms',
  'sway bar links':         'Replace sway bar links',
  'struts/shocks':          'Replace struts/shocks',
  'struts shocks':          'Replace struts/shocks',
  'struts':                 'Replace struts/shocks',
  'shocks':                 'Replace struts/shocks',
  'ball joints':            'Replace ball joints',
  'tie rods':               'Replace tie rods',
  'cv axle':                'Replace CV axle',
  'rack and pinion':        'Inspect/replace rack and pinion',
  'transmission fluid':     'Transmission fluid service',
  'transmission service':   'Perform transmission service',
}

function deriveTitle(label: string): string {
  const key = label.toLowerCase().trim()
  return TITLE_MAP[key] ?? `Inspect/service: ${label}`
}

function deriveDescription(status: 'attention' | 'urgent'): string {
  return status === 'urgent'
    ? 'Critical issue requiring immediate attention. Do not delay service.'
    : 'Requires attention. Recommend addressing on next service visit.'
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
 *     ADD COLUMN IF NOT EXISTS inspection_item_id uuid REFERENCES inspection_items(id) ON DELETE CASCADE,
 *     ADD COLUMN IF NOT EXISTS estimated_price    numeric(10,2);
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

  // ── 4. Separate items into flagged (warning/critical) vs cleared ──────────
  type FlaggedItem = {
    inspection_item_id: string
    label:              string
    itemStatus:         'attention' | 'urgent'
  }

  const flaggedItems:       FlaggedItem[] = []
  const clearedItemIds:     string[]      = []

  for (const item of items) {
    const saved = savedItemMap.get(item.template_item_id)
    if (!saved) continue

    if (item.status === 'attention' || item.status === 'urgent') {
      flaggedItems.push({
        inspection_item_id: saved.id,
        label:              (item.label ?? item.template_item_id).trim(),
        itemStatus:         item.status,
      })
    } else {
      clearedItemIds.push(saved.id)
    }
  }

  // ── 5. Fetch existing recommendations to preserve their decision status ───
  //    We only want to INSERT for new items, UPDATE metadata for existing ones.
  //    This prevents overwriting 'accepted' → 'pending' on re-save.
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
      priority:           f.itemStatus === 'urgent' ? 'high' : 'medium',
      status:             'pending',
      estimated_price:    null,
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
        title:       deriveTitle(f.label),
        description: deriveDescription(f.itemStatus),
        priority:    f.itemStatus === 'urgent' ? 'high' : 'medium',
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
  //    Use completeInspection() to explicitly finalize.
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
    })
    .eq('tenant_id', tenantId)
    .eq('id', inspectionId)

  if (updateError) {
    console.error('[saveInspectionResults] update inspection:', updateError.message)
    return { error: updateError.message }
  }

  return null
}
