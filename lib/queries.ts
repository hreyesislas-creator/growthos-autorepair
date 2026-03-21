// ============================================================
// GrowthOS AutoRepair — Supabase Query Helpers
// All server-side data fetching functions by domain
// ============================================================

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type {
  Appointment,
  AppointmentRow,
  Customer,
  CustomerRow,
  Vehicle,
  Inspection,
  InspectionTemplate,
  InspectionTemplateItem,
  MessageLog,
  MessageTemplate,
  TireBrand,
  VehicleServiceBrand,
  Service,
  Special,
  GalleryItem,
  TenantBillingSnapshot,
  BillingEvent,
  TenantUser,
  ReviewCache,
  ServiceHistory,
  ServiceRecommendation,
  SupportTicket,
  Tenant,
} from '@/lib/types'

const APPOINTMENT_DATE_COLUMN = 'appointment_date'

function hasValue(value?: string | null) {
  return typeof value === 'string' && value.trim().length > 0
}

// ── Appointments ─────────────────────────────────────────────

export async function getAppointments(tenantId: string, limit = 50): Promise<AppointmentRow[]> {
  if (!hasValue(tenantId)) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      customer:customers(first_name, last_name, phone),
      vehicle:vehicles(year, make, model)
    `)
    .eq('tenant_id', tenantId)
    .order(APPOINTMENT_DATE_COLUMN, { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getAppointments]', error.message)
    return []
  }

  return (data ?? []) as AppointmentRow[]
}

export async function getTodayAppointments(tenantId: string): Promise<AppointmentRow[]> {
  if (!hasValue(tenantId)) return []

  const supabase = await createClient()
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0, 10)
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      customer:customers(first_name, last_name, phone),
      vehicle:vehicles(year, make, model)
    `)
    .eq('tenant_id', tenantId)
    .gte(APPOINTMENT_DATE_COLUMN, start)
    .lt(APPOINTMENT_DATE_COLUMN, end)
    .order(APPOINTMENT_DATE_COLUMN, { ascending: true })

  if (error) {
    console.error('[getTodayAppointments]', error.message)
    return []
  }

  return (data ?? []) as AppointmentRow[]
}

export async function getAppointmentById(tenantId: string, id: string): Promise<AppointmentRow | null> {
  if (!hasValue(tenantId) || !hasValue(id)) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('appointments')
    .select(`*, customer:customers(*), vehicle:vehicles(*)`)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .single()

  if (error) {
    console.error('[getAppointmentById]', error.message)
    return null
  }

  return data as AppointmentRow | null
}

// ── Customers ─────────────────────────────────────────────────

export async function getCustomers(tenantId: string, search?: string): Promise<CustomerRow[]> {
  if (!hasValue(tenantId)) return []

  const supabase = await createClient()

  let query = supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (search && search.trim()) {
    const safeSearch = search.trim()
    query = query.or(
      `first_name.ilike.%${safeSearch}%,last_name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`
    )
  }

  const { data, error } = await query.limit(100)

  if (error) {
    console.error('[getCustomers]', error.message)
    return []
  }

  return (data ?? []) as CustomerRow[]
}

export async function getCustomerById(tenantId: string, id: string): Promise<Customer | null> {
  if (!hasValue(tenantId) || !hasValue(id)) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .single()

  if (error) {
    console.error('[getCustomerById]', error.message)
    return null
  }

  return data as Customer | null
}

export async function getCustomerCount(tenantId: string): Promise<number> {
  if (!hasValue(tenantId)) return 0

  const supabase = await createClient()

  const { count, error } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (error) {
    console.error('[getCustomerCount]', error.message)
    return 0
  }

  return count ?? 0
}

// ── Vehicles ──────────────────────────────────────────────────

export async function getVehicles(tenantId: string, customerId?: string): Promise<Vehicle[]> {
  if (!hasValue(tenantId)) return []

  const supabase = await createClient()

  let query = supabase
    .from('vehicles')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (hasValue(customerId)) {
    query = query.eq('customer_id', customerId)
  }

  const { data, error } = await query.limit(200)

  if (error) {
    console.error('[getVehicles]', error.message)
    return []
  }

  return (data ?? []) as Vehicle[]
}

export async function getVehicleById(tenantId: string, id: string): Promise<Vehicle | null> {
  if (!hasValue(tenantId) || !hasValue(id)) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .single()

  if (error) {
    console.error('[getVehicleById]', error.message)
    return null
  }

  return data as Vehicle | null
}

export async function getVehicleCount(tenantId: string): Promise<number> {
  if (!hasValue(tenantId)) return 0

  const supabase = await createClient()

  const { count, error } = await supabase
    .from('vehicles')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[getVehicleCount]', error.message)
    return 0
  }

  return count ?? 0
}

export async function getServiceHistory(tenantId: string, vehicleId: string): Promise<ServiceHistory[]> {
  if (!hasValue(tenantId) || !hasValue(vehicleId)) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('service_history')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('vehicle_id', vehicleId)
    .order('serviced_at', { ascending: false })

  if (error) {
    console.error('[getServiceHistory]', error.message)
    return []
  }

  return (data ?? []) as ServiceHistory[]
}

/**
 * Fetches all service recommendations auto-generated for a specific inspection.
 * Ordered by priority (urgent → high → medium → low) then created_at desc.
 */
export async function getInspectionRecommendations(
  tenantId: string,
  inspectionId: string,
): Promise<ServiceRecommendation[]> {
  if (!hasValue(tenantId) || !hasValue(inspectionId)) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('service_recommendations')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('inspection_id', inspectionId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getInspectionRecommendations]', error.message)
    return []
  }

  return (data ?? []) as ServiceRecommendation[]
}

export async function getRecommendations(tenantId: string, vehicleId: string): Promise<ServiceRecommendation[]> {
  if (!hasValue(tenantId) || !hasValue(vehicleId)) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('service_recommendations')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getRecommendations]', error.message)
    return []
  }

  return (data ?? []) as ServiceRecommendation[]
}

// ── Inspections ───────────────────────────────────────────────

export async function getInspections(tenantId: string): Promise<Inspection[]> {
  if (!hasValue(tenantId)) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inspections')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[getInspections]', error.message)
    return []
  }

  return (data ?? []) as Inspection[]
}

export async function getInspectionById(tenantId: string, id: string) {
  if (!hasValue(tenantId) || !hasValue(id)) {
    return {
      inspection: null,
      items: [],
    }
  }

  const supabase      = await createClient()
  // Use the service-role client for inspection_items so that RLS on that table
  // never silently filters the rows to [].  Security is already enforced by the
  // inspections query above — if the inspection doesn't belong to tenantId that
  // query returns null and the page returns notFound().
  const adminSupabase = createAdminClient()

  const [inspRes, itemsRes] = await Promise.all([
    supabase.from('inspections').select('*').eq('tenant_id', tenantId).eq('id', id).single(),
    adminSupabase
      .from('inspection_items')
      .select('template_item_id, status, notes')
      .eq('inspection_id', id)
      // order by created_at — the new inspection_items table has no display_order column
      .order('created_at', { ascending: true }),
  ])

  if (inspRes.error) {
    console.error('[getInspectionById inspection]', inspRes.error.message)
  }

  if (itemsRes.error) {
    console.error('[getInspectionById items]', itemsRes.error.message)
  }

  return {
    inspection: (inspRes.data as Inspection | null) ?? null,
    items: itemsRes.data ?? [],
  }
}

export async function getPendingInspectionCount(tenantId: string): Promise<number> {
  if (!hasValue(tenantId)) return 0

  const supabase = await createClient()

  const { count, error } = await supabase
    .from('inspections')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('status', ['draft', 'in_progress'])

  if (error) {
    console.error('[getPendingInspectionCount]', error.message)
    return 0
  }

  return count ?? 0
}

export async function getInspectionTemplates(tenantId: string): Promise<InspectionTemplate[]> {
  if (!hasValue(tenantId)) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inspection_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('created_at')

  if (error) {
    console.error('[getInspectionTemplates]', error.message)
    return []
  }

  return (data ?? []) as InspectionTemplate[]
}

export async function getTemplateItems(
  templateId: string,
  tenantId?: string,
): Promise<InspectionTemplateItem[]> {
  if (!hasValue(templateId)) return []

  const supabase = await createClient()

  let query = supabase
    .from('inspection_template_items')
    .select('*')
    .eq('template_id', templateId)
    // Sort: section first, then position within section
    .order('section_name', { ascending: true })
    .order('sort_order',   { ascending: true })

  if (tenantId && hasValue(tenantId)) {
    query = query.eq('tenant_id', tenantId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getTemplateItems]', error.message)
    return []
  }

  return (data ?? []) as InspectionTemplateItem[]
}

// ── Communications ────────────────────────────────────────────

export async function getMessageLogs(tenantId: string): Promise<MessageLog[]> {
  if (!hasValue(tenantId)) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('message_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[getMessageLogs]', error.message)
    return []
  }

  return (data ?? []) as MessageLog[]
}

export async function getMessageTemplates(tenantId: string): Promise<MessageTemplate[]> {
  if (!hasValue(tenantId)) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('created_at')

  if (error) {
    console.error('[getMessageTemplates]', error.message)
    return []
  }

  return (data ?? []) as MessageTemplate[]
}

export async function getWeeklyMessageCount(tenantId: string): Promise<number> {
  if (!hasValue(tenantId)) return 0

  const supabase = await createClient()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { count, error } = await supabase
    .from('message_logs')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', weekAgo)

  if (error) {
    console.error('[getWeeklyMessageCount]', error.message)
    return 0
  }

  return count ?? 0
}

// ── Website / CMS ─────────────────────────────────────────────

export async function getServices(tenantId: string): Promise<Service[]> {
  if (!hasValue(tenantId)) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('display_order')

  if (error) {
    console.error('[getServices]', error.message)
    return []
  }

  return (data ?? []) as Service[]
}

export async function getSpecials(tenantId: string, activeOnly = false): Promise<Special[]> {
  if (!hasValue(tenantId)) return []

  const supabase = await createClient()

  let query = supabase.from('specials').select('*').eq('tenant_id', tenantId).order('display_order')

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getSpecials]', error.message)
    return []
  }

  return (data ?? []) as Special[]
}

export async function getTireBrands(tenantId: string): Promise<TireBrand[]> {
  if (!hasValue(tenantId)) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tire_brands')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('display_order')

  if (error) {
    console.error('[getTireBrands]', error.message)
    return []
  }

  return (data ?? []) as TireBrand[]
}

export async function getVehicleServiceBrands(tenantId: string): Promise<VehicleServiceBrand[]> {
  if (!hasValue(tenantId)) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vehicle_service_brands')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('display_order')

  if (error) {
    console.error('[getVehicleServiceBrands]', error.message)
    return []
  }

  return (data ?? []) as VehicleServiceBrand[]
}

export async function getGalleryItems(tenantId: string, activeOnly = false): Promise<GalleryItem[]> {
  if (!hasValue(tenantId)) return []

  const supabase = await createClient()

  let query = supabase.from('gallery_items').select('*').eq('tenant_id', tenantId).order('display_order')

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getGalleryItems]', error.message)
    return []
  }

  return (data ?? []) as GalleryItem[]
}

export async function getReviews(tenantId: string, featuredOnly = false): Promise<ReviewCache[]> {
  if (!hasValue(tenantId)) return []

  const supabase = await createClient()

  let query = supabase
    .from('reviews_cache')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('review_date', { ascending: false })
    .limit(20)

  if (featuredOnly) {
    query = query.eq('is_featured', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getReviews]', error.message)
    return []
  }

  return (data ?? []) as ReviewCache[]
}

// ── Billing ───────────────────────────────────────────────────

export async function getBillingSnapshot(tenantId: string): Promise<TenantBillingSnapshot | null> {
  if (!hasValue(tenantId)) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenant_billing_snapshots')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    console.error('[getBillingSnapshot]', error.message)
    return null
  }

  return data as TenantBillingSnapshot | null
}

export async function getBillingEvents(tenantId: string): Promise<BillingEvent[]> {
  if (!hasValue(tenantId)) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('billing_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[getBillingEvents]', error.message)
    return []
  }

  return (data ?? []) as BillingEvent[]
}

// ── Team ──────────────────────────────────────────────────────

/**
 * Returns the tenant_users row for the currently logged-in Supabase auth user.
 * Used to pre-populate technician / assigned_user fields with the current user.
 * The real DB column is `auth_user_id` (same as what tenant.ts queries).
 */
export async function getCurrentTenantUser(tenantId: string): Promise<TenantUser | null> {
  if (!hasValue(tenantId)) return null

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('tenant_users')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('auth_user_id', user.id)
    .single()

  if (error) {
    console.error('[getCurrentTenantUser]', error.message)
    return null
  }

  return data as TenantUser | null
}

/**
 * Returns a single tenant_users row by its primary key (not auth_user_id).
 * Used to resolve technician name/email for display on the inspection page.
 */
export async function getTenantUserById(
  tenantId: string,
  userId: string,
): Promise<TenantUser | null> {
  if (!hasValue(tenantId) || !hasValue(userId)) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenant_users')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[getTenantUserById]', error.message)
    return null
  }

  return data as TenantUser | null
}

export async function getTeamUsers(tenantId: string): Promise<TenantUser[]> {
  if (!hasValue(tenantId)) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenant_users')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at')

  if (error) {
    console.error('[getTeamUsers]', error.message)
    return []
  }

  return (data ?? []) as TenantUser[]
}

// ── Master Admin ──────────────────────────────────────────────

export async function getAllTenants(): Promise<Tenant[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getAllTenants]', error.message)
    return []
  }

  return (data ?? []) as Tenant[]
}

export async function getSupportTickets(tenantId?: string): Promise<SupportTicket[]> {
  const supabase = await createClient()

  let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false })

  if (hasValue(tenantId)) {
    query = query.eq('tenant_id', tenantId)
  }

  const { data, error } = await query.limit(100)

  if (error) {
    console.error('[getSupportTickets]', error.message)
    return []
  }

  return (data ?? []) as SupportTicket[]
}