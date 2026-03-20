'use server'

import { createClient } from '@/lib/supabase/server'
import { getDashboardTenant } from '@/lib/tenant'

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

// ── Save DVI results ──────────────────────────────────────────────────────────

export interface InspectionResultItem {
  template_item_id: string
  status: 'pass' | 'attention' | 'urgent' | 'not_checked'
  notes: string | null
}

/**
 * Persists checklist results for one inspection.
 *
 * 1. Upserts inspection_items rows (conflict key: inspection_id + template_item_id).
 * 2. Updates inspections with aggregate counts and advances status:
 *    - 'in_progress' while any item is still not_checked
 *    - 'completed'   when every item has been reviewed
 *
 * Requires a unique constraint on inspection_items(inspection_id, template_item_id).
 * SQL migration (run once in Supabase SQL editor):
 *   ALTER TABLE inspections
 *     ADD COLUMN IF NOT EXISTS total_items    integer DEFAULT 0,
 *     ADD COLUMN IF NOT EXISTS critical_count integer DEFAULT 0,
 *     ADD COLUMN IF NOT EXISTS warning_count  integer DEFAULT 0;
 *
 *   ALTER TABLE inspection_items
 *     ADD CONSTRAINT inspection_items_inspection_template_unique
 *     UNIQUE (inspection_id, template_item_id);
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

  const supabase    = await createClient()
  const tenantId    = ctx.tenant.id

  // ── 1. Upsert all item results ────────────────────────────────────────────
  const rows = items.map(item => ({
    tenant_id:        tenantId,
    inspection_id:    inspectionId,
    template_item_id: item.template_item_id,
    status:           item.status,
    notes:            item.notes ?? null,
  }))

  const { error: upsertError } = await supabase
    .from('inspection_items')
    .upsert(rows, { onConflict: 'inspection_id,template_item_id' })

  if (upsertError) {
    console.error('[saveInspectionResults] upsert:', upsertError.message)
    return { error: upsertError.message }
  }

  // ── 2. Compute aggregates ─────────────────────────────────────────────────
  const totalItems    = items.length
  const criticalCount = items.filter(i => i.status === 'urgent').length
  const warningCount  = items.filter(i => i.status === 'attention').length
  const allChecked    = items.every(i => i.status !== 'not_checked')

  const newStatus = allChecked ? 'completed' : 'in_progress'

  // ── 3. Update inspection header ───────────────────────────────────────────
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
