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
 * Persists DVI checklist results, then auto-generates or removes service
 * recommendations based on each item's status.
 *
 * Flow:
 *  1. Upsert inspection_items  (conflict: inspection_id, template_item_id)
 *  2. Re-fetch inspection_items to get their DB-assigned IDs
 *  3. Fetch the inspection header to get vehicle_id / customer_id
 *  4. For warning/critical items → upsert service_recommendations
 *  5. For OK / N/C items        → delete any existing recommendation
 *  6. Update inspections aggregate counts + status
 *
 * Required DB migrations (run once in Supabase SQL editor):
 *
 *   -- Aggregate columns on inspections
 *   ALTER TABLE inspections
 *     ADD COLUMN IF NOT EXISTS total_items    integer DEFAULT 0,
 *     ADD COLUMN IF NOT EXISTS critical_count integer DEFAULT 0,
 *     ADD COLUMN IF NOT EXISTS warning_count  integer DEFAULT 0;
 *
 *   -- Unique constraint so upsert resolves correctly
 *   ALTER TABLE inspection_items
 *     ADD CONSTRAINT inspection_items_inspection_template_unique
 *     UNIQUE (inspection_id, template_item_id);
 *
 *   -- New columns on service_recommendations
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

  // ── 1. Upsert inspection_items ────────────────────────────────────────────
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

  // ── 2. Re-fetch inspection_items to get DB-assigned IDs ───────────────────
  //    We need inspection_items.id to use as inspection_item_id FK on recs.
  const templateItemIds = items.map(i => i.template_item_id)

  const { data: savedItems, error: fetchError } = await supabase
    .from('inspection_items')
    .select('id, template_item_id, status')
    .eq('tenant_id', tenantId)
    .eq('inspection_id', inspectionId)
    .in('template_item_id', templateItemIds)

  if (fetchError) {
    console.error('[saveInspectionResults] fetch items:', fetchError.message)
    return { error: fetchError.message }
  }

  // Map template_item_id → { inspection_item_id, status }
  const savedMap = new Map<string, { id: string; status: string }>(
    (savedItems ?? []).map(r => [r.template_item_id as string, { id: r.id, status: r.status }])
  )

  // ── 3. Fetch inspection header for vehicle_id / customer_id ───────────────
  const { data: inspectionRow } = await supabase
    .from('inspections')
    .select('vehicle_id, customer_id')
    .eq('tenant_id', tenantId)
    .eq('id', inspectionId)
    .single()

  const vehicleId  = inspectionRow?.vehicle_id  ?? null
  const customerId = inspectionRow?.customer_id ?? null

  // ── 4 & 5. Generate or remove recommendations per item ────────────────────
  const recsToUpsert: {
    tenant_id:          string
    inspection_id:      string
    inspection_item_id: string
    vehicle_id:         string | null
    customer_id:        string | null
    title:              string
    description:        string
    priority:           'medium' | 'high'
    status:             'open'
    estimated_price:    null
  }[] = []

  const itemIdsToDelete: string[] = []

  for (const item of items) {
    const saved = savedMap.get(item.template_item_id)
    if (!saved) continue

    if (item.status === 'attention' || item.status === 'urgent') {
      const label = (item.label ?? item.template_item_id).trim()
      recsToUpsert.push({
        tenant_id:          tenantId,
        inspection_id:      inspectionId,
        inspection_item_id: saved.id,
        vehicle_id:         vehicleId,
        customer_id:        customerId,
        title:              deriveTitle(label),
        description:        deriveDescription(item.status),
        priority:           item.status === 'urgent' ? 'high' : 'medium',
        status:             'open',
        estimated_price:    null,
      })
    } else {
      // OK or N/C — remove any existing recommendation for this item
      itemIdsToDelete.push(saved.id)
    }
  }

  // Upsert recommendations for flagged items
  if (recsToUpsert.length > 0) {
    const { error: recUpsertError } = await supabase
      .from('service_recommendations')
      .upsert(recsToUpsert, { onConflict: 'inspection_item_id' })

    if (recUpsertError) {
      console.error('[saveInspectionResults] upsert recs:', recUpsertError.message)
      // Non-fatal — don't abort the save, but surface the error
      return { error: recUpsertError.message }
    }
  }

  // Delete recommendations for cleared items
  if (itemIdsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('service_recommendations')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('inspection_id', inspectionId)
      .in('inspection_item_id', itemIdsToDelete)

    if (deleteError) {
      console.error('[saveInspectionResults] delete recs:', deleteError.message)
      // Non-fatal
    }
  }

  // ── 6. Update inspection aggregate counts + status ────────────────────────
  const totalItems    = items.length
  const criticalCount = items.filter(i => i.status === 'urgent').length
  const warningCount  = items.filter(i => i.status === 'attention').length
  const allChecked    = items.every(i => i.status !== 'not_checked')
  const newStatus     = allChecked ? 'completed' : 'in_progress'

  const { error: updateError } = await supabase
    .from('inspections')
    .update({
      total_items:    totalItems,
      critical_count: criticalCount,
      warning_count:  warningCount,
      status:         newStatus,
      ...(allChecked ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('tenant_id', tenantId)
    .eq('id', inspectionId)

  if (updateError) {
    console.error('[saveInspectionResults] update inspection:', updateError.message)
    return { error: updateError.message }
  }

  return null
}
