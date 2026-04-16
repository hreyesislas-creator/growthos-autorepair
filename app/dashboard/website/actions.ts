'use server'

import { denyUnlessCanEditDashboardModule } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'
import { getDashboardTenant } from '@/lib/tenant'

// ── Homepage Content ──────────────────────────────────────────

export async function saveHomepageContent(
  formData: FormData
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const websiteDenied = await denyUnlessCanEditDashboardModule('website')
  if (websiteDenied) return websiteDenied

  const tenantId = ctx.tenant.id
  const supabase = await createClient()

  const payload = {
    tenant_id:        tenantId,
    hero_headline:    String(formData.get('hero_headline')    ?? '').trim() || null,
    hero_subheadline: String(formData.get('hero_subheadline') ?? '').trim() || null,
    hero_cta_text:    String(formData.get('hero_cta_text')    ?? '').trim() || null,
    hero_cta_url:     String(formData.get('hero_cta_url')     ?? '').trim() || null,
    about_body:       String(formData.get('about_body')       ?? '').trim() || null,
    updated_at:       new Date().toISOString(),
  }

  // Upsert — creates row if not yet seeded
  const { error } = await supabase
    .from('homepage_content')
    .upsert(payload, { onConflict: 'tenant_id' })

  if (error) return { error: error.message }
  return null
}

// ── Section Visibility ────────────────────────────────────────

export async function saveSectionVisibility(
  formData: FormData
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const websiteDenied = await denyUnlessCanEditDashboardModule('website')
  if (websiteDenied) return websiteDenied

  const tenantId = ctx.tenant.id
  const supabase = await createClient()

  const bool = (key: string) => formData.get(key) === 'on'

  const payload = {
    tenant_id:               tenantId,
    show_hero:               bool('show_hero'),
    show_services:           bool('show_services'),
    show_trust:              bool('show_trust'),
    show_tire_brands:        bool('show_tire_brands'),
    show_specials:           bool('show_specials'),
    show_vehicles_we_service:bool('show_vehicles_we_service'),
    show_warranty:           bool('show_warranty'),
    show_gallery:            bool('show_gallery'),
    show_reviews:            bool('show_reviews'),
    show_financing:          bool('show_financing'),
    show_about:              bool('show_about'),
    updated_at:              new Date().toISOString(),
  }

  const { error } = await supabase
    .from('website_settings')
    .upsert(payload, { onConflict: 'tenant_id' })

  if (error) return { error: error.message }
  return null
}

// ── Tire Brands ───────────────────────────────────────────────

export async function addTireBrand(
  formData: FormData
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const websiteDenied = await denyUnlessCanEditDashboardModule('website')
  if (websiteDenied) return websiteDenied

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'Brand name is required' }

  const supabase = await createClient()

  const { error } = await supabase.from('tire_brands').insert({
    tenant_id:     ctx.tenant.id,
    name,
    logo_url:      String(formData.get('logo_url') ?? '').trim() || null,
    display_order: 99,
    is_active:     true,
  })

  if (error) return { error: error.message }
  return null
}

// ── Vehicle Service Brands (Makes) ────────────────────────────

export async function addVehicleMake(
  formData: FormData
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const websiteDenied = await denyUnlessCanEditDashboardModule('website')
  if (websiteDenied) return websiteDenied

  const make = String(formData.get('make') ?? '').trim()
  if (!make) return { error: 'Make is required' }

  const supabase = await createClient()

  const { error } = await supabase.from('vehicle_service_brands').insert({
    tenant_id:     ctx.tenant.id,
    make,
    logo_url:      String(formData.get('logo_url')   ?? '').trim() || null,
    page_slug:     String(formData.get('page_slug')  ?? '').trim() || null,
    display_order: 99,
    is_active:     true,
  })

  if (error) return { error: error.message }
  return null
}

// ── Specials ──────────────────────────────────────────────────

export async function addSpecial(
  formData: FormData
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const websiteDenied = await denyUnlessCanEditDashboardModule('website')
  if (websiteDenied) return websiteDenied

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return { error: 'Title is required' }

  const supabase = await createClient()

  const { error } = await supabase.from('specials').insert({
    tenant_id:     ctx.tenant.id,
    title,
    price_display: String(formData.get('price_display') ?? '').trim() || null,
    description:   String(formData.get('description')   ?? '').trim() || null,
    fine_print:    String(formData.get('fine_print')     ?? '').trim() || null,
    expires_at:    String(formData.get('expires_at')     ?? '').trim() || null,
    display_order: 99,
    is_active:     true,
  })

  if (error) return { error: error.message }
  return null
}

// ── Gallery ───────────────────────────────────────────────────

export async function addGalleryItem(
  formData: FormData
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const websiteDenied = await denyUnlessCanEditDashboardModule('website')
  if (websiteDenied) return websiteDenied

  const imageUrl = String(formData.get('image_url') ?? '').trim()
  if (!imageUrl) return { error: 'Image URL is required' }

  const supabase = await createClient()

  const { error } = await supabase.from('gallery_items').insert({
    tenant_id:     ctx.tenant.id,
    image_url:     imageUrl,
    caption:       String(formData.get('caption') ?? '').trim() || null,
    display_order: 99,
    is_active:     true,
  })

  if (error) return { error: error.message }
  return null
}
