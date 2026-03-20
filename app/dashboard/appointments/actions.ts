'use server'

import { createClient } from '@/lib/supabase/server'
import { getDashboardTenant } from '@/lib/tenant'

export async function createAppointment(
  formData: FormData,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const supabase = await createClient()
  const { error } = await supabase.from('appointments').insert({
    tenant_id:         ctx.tenant.id,
    customer_id:       String(formData.get('customer_id')       ?? '').trim() || null,
    vehicle_id:        String(formData.get('vehicle_id')        ?? '').trim() || null,
    appointment_date:  String(formData.get('appointment_date')  ?? '').trim() || null,
    appointment_time:  String(formData.get('appointment_time')  ?? '').trim() || null,
    requested_service: String(formData.get('requested_service') ?? '').trim() || null,
    status:            String(formData.get('status')            ?? 'pending'),
    source:            String(formData.get('source')            ?? 'phone'),
    notes:             String(formData.get('notes')             ?? '').trim() || null,
  })

  if (error) return { error: error.message }
  return null
}

export async function updateAppointment(
  formData: FormData,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { error: 'Missing appointment ID' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('appointments')
    .update({
      customer_id:       String(formData.get('customer_id')       ?? '').trim() || null,
      vehicle_id:        String(formData.get('vehicle_id')        ?? '').trim() || null,
      appointment_date:  String(formData.get('appointment_date')  ?? '').trim() || null,
      appointment_time:  String(formData.get('appointment_time')  ?? '').trim() || null,
      requested_service: String(formData.get('requested_service') ?? '').trim() || null,
      status:            String(formData.get('status')            ?? 'pending'),
      source:            String(formData.get('source')            ?? 'phone'),
      notes:             String(formData.get('notes')             ?? '').trim() || null,
      updated_at:        new Date().toISOString(),
    })
    .eq('tenant_id', ctx.tenant.id)
    .eq('id', id)

  if (error) return { error: error.message }
  return null
}
