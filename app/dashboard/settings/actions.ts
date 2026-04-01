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
  const num = (key: string) => {
    const val = String(formData.get(key) ?? '').trim()
    return val ? parseFloat(val) : null
  }

  const { error } = await supabase
    .from('business_profiles')
    .upsert({
      tenant_id:        ctx.tenant.id,
      business_name:    str('business_name'),
      phone:            str('phone'),
      email:            str('email'),
      website:          str('website'),
      address_line_1:   str('address_line_1'),
      address_line_2:   str('address_line_2'),
      city:             str('city'),
      state:            str('state'),
      zip_code:         str('zip_code'),
      bar_license:      str('bar_license'),
      seller_permit:    str('seller_permit'),
      tax_rate:         num('tax_rate'),
      labor_rate:       num('labor_rate'),
      warranty_text:    str('warranty_text'),
      invoice_terms:    str('invoice_terms'),
      invoice_footer:   str('invoice_footer'),
      updated_at:       new Date().toISOString(),
    }, { onConflict: 'tenant_id' })

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
