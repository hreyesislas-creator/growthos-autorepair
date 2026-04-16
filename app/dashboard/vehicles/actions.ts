'use server'

import {
  denyUnlessCanEditAllDashboardModules,
  denyUnlessCanEditDashboardModule,
} from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'
import { getDashboardTenant } from '@/lib/tenant'

// ── Create vehicle with customer link ─────────────────────────
//
// customer_mode = 'select' → use customer_id from formData directly
// customer_mode = 'create' → create inline customer first (with phone dedup)

export async function createVehicleWithCustomer(formData: FormData): Promise<{
  error?: string
  existingCustomerId?: string
  existingCustomerName?: string
} | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const tenantId    = ctx.tenant.id
  const supabase    = await createClient()
  const mode        = String(formData.get('customer_mode') ?? 'select')
  let   customerId: string | null = null

  const vehComboDenied =
    mode === 'create'
      ? await denyUnlessCanEditAllDashboardModules(['customers', 'vehicles'])
      : await denyUnlessCanEditDashboardModule('vehicles')
  if (vehComboDenied) return vehComboDenied

  if (mode === 'create') {
    // ── Phone duplicate check ────────────────────────────────
    const phone = String(formData.get('new_phone') ?? '').trim() || null
    if (phone) {
      const { data: dup } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .eq('tenant_id', tenantId)
        .eq('phone', phone)
        .maybeSingle()

      if (dup) {
        return {
          existingCustomerId:   dup.id,
          existingCustomerName: `${dup.first_name} ${dup.last_name}`.trim(),
        }
      }
    }

    // ── Create new customer ──────────────────────────────────
    const firstName = String(formData.get('new_first_name') ?? '').trim()
    const lastName  = String(formData.get('new_last_name')  ?? '').trim()
    if (!firstName) return { error: 'Customer first name is required when creating a new customer' }

    const { data: newCust, error: custErr } = await supabase
      .from('customers')
      .insert({
        tenant_id:  tenantId,
        first_name: firstName,
        last_name:  lastName,
        full_name:  [firstName, lastName].filter(Boolean).join(' '),
        phone,
        email:      String(formData.get('new_email') ?? '').trim() || null,
        is_active:  true,
      })
      .select('id')
      .single()

    if (custErr || !newCust) {
      return { error: custErr?.message ?? 'Failed to create customer' }
    }

    customerId = newCust.id

  } else {
    // mode = 'select'
    customerId = String(formData.get('customer_id') ?? '').trim() || null
    if (!customerId) return { error: 'Please select a customer or create one inline' }
  }

  // ── Create vehicle ───────────────────────────────────────────
  const yearStr    = String(formData.get('year')    ?? '').trim()
  const mileageStr = String(formData.get('mileage') ?? '').trim()

  const { error: vehErr } = await supabase.from('vehicles').insert({
    tenant_id:     tenantId,
    customer_id:   customerId,
    vin:           String(formData.get('vin')           ?? '').trim() || null,
    year:          yearStr    ? parseInt(yearStr, 10)    : null,
    make:          String(formData.get('make')          ?? '').trim() || null,
    model:         String(formData.get('model')         ?? '').trim() || null,
    trim:          String(formData.get('trim')          ?? '').trim() || null,
    license_plate: String(formData.get('license_plate') ?? '').trim() || null,
    color:         String(formData.get('color')         ?? '').trim() || null,
    mileage:       mileageStr ? parseInt(mileageStr, 10) : null,
    notes:         String(formData.get('notes')         ?? '').trim() || null,
  })

  if (vehErr) return { error: vehErr.message }
  return null
}

// ── Update vehicle (unchanged) ────────────────────────────────

export async function createVehicle(
  formData: FormData,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const createVehDenied = await denyUnlessCanEditDashboardModule('vehicles')
  if (createVehDenied) return createVehDenied

  const yearStr    = String(formData.get('year')    ?? '').trim()
  const mileageStr = String(formData.get('mileage') ?? '').trim()

  const supabase = await createClient()
  const { error } = await supabase.from('vehicles').insert({
    tenant_id:     ctx.tenant.id,
    customer_id:   String(formData.get('customer_id')   ?? '').trim() || null,
    year:          yearStr    ? parseInt(yearStr, 10)    : null,
    make:          String(formData.get('make')          ?? '').trim() || null,
    model:         String(formData.get('model')         ?? '').trim() || null,
    trim:          String(formData.get('trim')          ?? '').trim() || null,
    vin:           String(formData.get('vin')           ?? '').trim() || null,
    license_plate: String(formData.get('license_plate') ?? '').trim() || null,
    color:         String(formData.get('color')         ?? '').trim() || null,
    mileage:       mileageStr ? parseInt(mileageStr, 10) : null,
    notes:         String(formData.get('notes')         ?? '').trim() || null,
  })

  if (error) return { error: error.message }
  return null
}

export async function updateVehicle(
  formData: FormData,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const updateVehDenied = await denyUnlessCanEditDashboardModule('vehicles')
  if (updateVehDenied) return updateVehDenied

  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { error: 'Missing vehicle ID' }

  const yearStr    = String(formData.get('year')    ?? '').trim()
  const mileageStr = String(formData.get('mileage') ?? '').trim()

  const supabase = await createClient()
  const { error } = await supabase
    .from('vehicles')
    .update({
      customer_id:   String(formData.get('customer_id')   ?? '').trim() || null,
      year:          yearStr    ? parseInt(yearStr, 10)    : null,
      make:          String(formData.get('make')          ?? '').trim() || null,
      model:         String(formData.get('model')         ?? '').trim() || null,
      trim:          String(formData.get('trim')          ?? '').trim() || null,
      vin:           String(formData.get('vin')           ?? '').trim() || null,
      license_plate: String(formData.get('license_plate') ?? '').trim() || null,
      color:         String(formData.get('color')         ?? '').trim() || null,
      mileage:       mileageStr ? parseInt(mileageStr, 10) : null,
      notes:         String(formData.get('notes')         ?? '').trim() || null,
      updated_at:    new Date().toISOString(),
    })
    .eq('tenant_id', ctx.tenant.id)
    .eq('id', id)

  if (error) return { error: error.message }
  return null
}
