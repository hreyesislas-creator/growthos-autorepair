'use server'

import {
  denyUnlessCanEditAllDashboardModules,
  denyUnlessCanEditDashboardModule,
} from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'
import { getDashboardTenant } from '@/lib/tenant'

// ── Create customer (simple, no vehicle) ─────────────────────

export async function createCustomer(
  formData: FormData,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const createCustDenied = await denyUnlessCanEditDashboardModule('customers')
  if (createCustDenied) return createCustDenied

  const supabase  = await createClient()
  const firstName = String(formData.get('first_name') ?? '').trim()
  const lastName  = String(formData.get('last_name')  ?? '').trim()
  const { error } = await supabase.from('customers').insert({
    tenant_id:  ctx.tenant.id,
    first_name: firstName,
    last_name:  lastName,
    full_name:  [firstName, lastName].filter(Boolean).join(' '),
    email:      String(formData.get('email')   ?? '').trim() || null,
    phone:      String(formData.get('phone')   ?? '').trim() || null,
    address:    String(formData.get('address') ?? '').trim() || null,
    notes:      String(formData.get('notes')   ?? '').trim() || null,
    source:     String(formData.get('source')  ?? '').trim() || null,
    is_active:  true,
  })

  if (error) return { error: error.message }
  return null
}

// ── Create customer + optional vehicle in one round trip ──────

export async function createCustomerAndVehicle(formData: FormData): Promise<{
  error?: string
  /** set when a phone duplicate is detected on the customer */
  existingCustomerId?: string
  existingCustomerName?: string
} | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const addVehicle = formData.get('add_vehicle') === 'yes'
  const combinedDenied = addVehicle
    ? await denyUnlessCanEditAllDashboardModules(['customers', 'vehicles'])
    : await denyUnlessCanEditDashboardModule('customers')
  if (combinedDenied) return combinedDenied

  const tenantId = ctx.tenant.id
  const supabase = await createClient()

  // ── 1. Phone duplicate check ───────────────────────────────
  const phone = String(formData.get('phone') ?? '').trim() || null
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

  // ── 2. Create customer ─────────────────────────────────────
  const firstName = String(formData.get('first_name') ?? '').trim()
  const lastName  = String(formData.get('last_name')  ?? '').trim()
  const { data: newCustomer, error: custErr } = await supabase
    .from('customers')
    .insert({
      tenant_id:  tenantId,
      first_name: firstName,
      last_name:  lastName,
      full_name:  [firstName, lastName].filter(Boolean).join(' '),
      email:      String(formData.get('email')   ?? '').trim() || null,
      phone,
      address:    String(formData.get('address') ?? '').trim() || null,
      notes:      String(formData.get('notes')   ?? '').trim() || null,
      source:     String(formData.get('source')  ?? '').trim() || null,
      is_active:  true,
    })
    .select('id')
    .single()

  if (custErr || !newCustomer) {
    return { error: custErr?.message ?? 'Failed to create customer' }
  }

  const customerId = newCustomer.id

  // ── 3. Create vehicle if vehicle fields provided ───────────
  if (addVehicle) {
    const vin     = String(formData.get('vin')  ?? '').trim() || null
    const make    = String(formData.get('make') ?? '').trim() || null
    const model   = String(formData.get('model')      ?? '').trim() || null
    const yearStr = String(formData.get('year')       ?? '').trim()
    const year    = yearStr ? parseInt(yearStr, 10) : null

    // Only insert vehicle if we have at minimum a VIN or make+model
    if (vin || (make && model)) {
      const { error: vehErr } = await supabase.from('vehicles').insert({
        tenant_id:     tenantId,
        customer_id:   customerId,
        vin,
        year,
        make,
        model:         model,
        trim:          String(formData.get('vtrim')         ?? '').trim() || null,
        license_plate: String(formData.get('license_plate') ?? '').trim() || null,
        color:         String(formData.get('color')         ?? '').trim() || null,
        mileage:       String(formData.get('mileage') ?? '').trim()
                         ? parseInt(String(formData.get('mileage')), 10) : null,
        notes:         String(formData.get('vehicle_notes') ?? '').trim() || null,
      })

      if (vehErr) {
        // Customer was created — surface a warning but don't fail entirely
        return {
          error: `Customer created, but vehicle failed: ${vehErr.message}. You can add the vehicle from the Vehicles page.`,
        }
      }
    }
  }

  return null
}

// ── Update customer ───────────────────────────────────────────

export async function updateCustomer(
  formData: FormData,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const updateCustDenied = await denyUnlessCanEditDashboardModule('customers')
  if (updateCustDenied) return updateCustDenied

  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { error: 'Missing customer ID' }

  const supabase  = await createClient()
  const firstName = String(formData.get('first_name') ?? '').trim()
  const lastName  = String(formData.get('last_name')  ?? '').trim()
  const { error } = await supabase
    .from('customers')
    .update({
      first_name:  firstName,
      last_name:   lastName,
      full_name:   [firstName, lastName].filter(Boolean).join(' '),
      email:       String(formData.get('email')   ?? '').trim() || null,
      phone:       String(formData.get('phone')   ?? '').trim() || null,
      address:     String(formData.get('address') ?? '').trim() || null,
      notes:       String(formData.get('notes')   ?? '').trim() || null,
      source:      String(formData.get('source')  ?? '').trim() || null,
      updated_at:  new Date().toISOString(),
    })
    .eq('tenant_id', ctx.tenant.id)
    .eq('id', id)

  if (error) return { error: error.message }
  return null
}
