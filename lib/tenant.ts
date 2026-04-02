import { createClient } from '@/lib/supabase/server'
import type { Tenant, BusinessProfile, WebsiteSettings, TenantContext } from '@/lib/types'

const DEFAULT_SLUG = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? 'ee-tires-demo'

/**
 * Resolves a tenant by slug.
 * Falls back to DEFAULT_SLUG in development if slug is missing.
 */
export async function getTenantBySlug(slug?: string): Promise<TenantContext | null> {
  const supabase = await createClient()
  const targetSlug = slug ?? DEFAULT_SLUG

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', targetSlug)
    .single<Tenant>()

  if (error || !tenant) {
    console.error('[getTenantBySlug] not found:', targetSlug, error?.message)
    return null
  }

  const [profileRes, settingsRes] = await Promise.all([
    supabase
      .from('business_profiles')
      .select('*')
      .eq('tenant_id', tenant.id)
      .single<BusinessProfile>(),
    supabase
      .from('website_settings')
      .select('*')
      .eq('tenant_id', tenant.id)
      .single<WebsiteSettings>(),
  ])

  return {
    tenant,
    profile: profileRes.data ?? null,
    settings: settingsRes.data ?? null,
  }
}

/**
 * Resolves the active dashboard tenant for the logged-in user.
 * Reads tenant_id from the user's tenant_users record.
 */
export async function getDashboardTenant(): Promise<TenantContext | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  console.log('[getDashboardTenant] AUTH CHECK:', 'user:', user?.id ?? 'null', '| email:', user?.email ?? 'null')

  if (!user) return null

  const { data: tenantUser, error: tuError } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (tuError) {
    console.error('[getDashboardTenant] tenant_users query failed:', tuError.message)
    return null
  }

  console.log('[getDashboardTenant] tenantUser:', tenantUser?.tenant_id ?? 'null')

  if (!tenantUser?.tenant_id) {
    console.warn('[getDashboardTenant] user has no active tenant mapping')
    return null
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantUser.tenant_id)
    .single<Tenant>()

  console.log('[getDashboardTenant] tenant row:', tenant?.slug ?? 'null')

  if (!tenant) return null
  return getTenantBySlug(tenant.slug)
}

/** Quick helper — just the tenant row, no joins */
export async function getTenantId(slug?: string): Promise<string | null> {
  const ctx = await getTenantBySlug(slug)
  return ctx?.tenant.id ?? null
}
