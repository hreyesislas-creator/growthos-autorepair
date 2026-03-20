'use server'

import { createClient } from '@/lib/supabase/server'
import { getDashboardTenant } from '@/lib/tenant'

export async function updateBusinessProfile(
  formData: FormData
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const supabase = await createClient()

  const str = (key: string) => String(formData.get(key) ?? '').trim() || null

  const { error } = await supabase
    .from('business_profiles')
    .update({
      business_name:  str('business_name'),
      phone:          str('phone'),
      email:          str('email'),
      address_street: str('address_street'),
      address_city:   str('address_city'),
      address_state:  str('address_state'),
      address_zip:    str('address_zip'),
      updated_at:     new Date().toISOString(),
    })
    .eq('tenant_id', ctx.tenant.id)

  if (error) return { error: error.message }
  return null
}

export async function updateWebsiteModules(
  formData: FormData
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const supabase = await createClient()
  const bool = (key: string) => formData.get(key) === 'on'

  const { error } = await supabase
    .from('website_settings')
    .upsert({
      tenant_id:                ctx.tenant.id,
      show_hero:                bool('show_hero'),
      show_services:            bool('show_services'),
      show_specials:            bool('show_specials'),
      show_tire_brands:         bool('show_tire_brands'),
      show_vehicles_we_service: bool('show_vehicles_we_service'),
      show_warranty:            bool('show_warranty'),
      show_gallery:             bool('show_gallery'),
      show_reviews:             bool('show_reviews'),
      show_financing:           bool('show_financing'),
      updated_at:               new Date().toISOString(),
    }, { onConflict: 'tenant_id' })

  if (error) return { error: error.message }
  return null
}
