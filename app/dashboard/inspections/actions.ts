'use server'

import { createClient } from '@/lib/supabase/server'
import { getDashboardTenant } from '@/lib/tenant'

export async function createInspection(
  formData: FormData
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const supabase = await createClient()

  const vehicleId  = String(formData.get('vehicle_id')  ?? '').trim() || null
  const customerId = String(formData.get('customer_id') ?? '').trim() || null
  const templateId = String(formData.get('template_id') ?? '').trim() || null
  const notes      = String(formData.get('notes')       ?? '').trim() || null

  const { error } = await supabase.from('inspections').insert({
    tenant_id:   ctx.tenant.id,
    vehicle_id:  vehicleId,
    customer_id: customerId,
    template_id: templateId,
    status:      'draft',
    notes,
  })

  if (error) return { error: error.message }
  return null
}
