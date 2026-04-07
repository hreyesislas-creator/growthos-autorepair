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
  InspectionRow,
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
  Estimate,
  EstimateItem,
  EstimateItemPart,
  EstimateWithItems,
  EstimateItemDecision,
  TenantPricingConfig,
  ServiceJobWithCategory,
  WorkOrder,
  WorkOrderItem,
  WorkOrderWithItems,
  Invoice,
  InvoiceItem,
  InvoiceWithItems,
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

export async function getInspections(tenantId: string): Promise<InspectionRow[]> {
  if (!hasValue(tenantId)) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inspections')
    .select('*, customer:customers(first_name, last_name), vehicle:vehicles(year, make, model)')
    .eq('tenant_id', tenantId)
    .eq('is_archived', false)          // Phase A: hide archived records from list
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[getInspections]', error.message)
    return []
  }

  return (data ?? []) as InspectionRow[]
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
      .eq('inspection_id', id),
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

/**
 * Fetches all inspection_items rows for the given inspection.
 *
 * Uses the service-role (admin) client so that RLS on inspection_items
 * can never silently filter the result to [].
 *
 * Security: tenant-scope is guaranteed by the caller — the inspection row
 * is always loaded with tenantId first; if it doesn't belong to the tenant
 * the page returns notFound() before this is called.
 *
 * Returns the array directly (never wraps in { data, error }).
 */
export async function getInspectionItemsByInspectionId(
  inspectionId: string,
): Promise<Array<{
  id:               string
  inspection_id:    string
  template_item_id: string | null
  status:           string | null
  notes:            string | null
  updated_at:       string
}>> {
  if (!hasValue(inspectionId)) {
    console.warn('[getInspectionItemsByInspectionId] called with empty inspectionId')
    return []
  }

  // Guard: surface a missing service-role key immediately rather than silently
  // returning [] because the admin client auth fails.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      '[getInspectionItemsByInspectionId] SUPABASE_SERVICE_ROLE_KEY is not set — ' +
      'the admin client will fail. Add it to .env.local.',
    )
  }

  const adminSupabase = createAdminClient()

  const { data, error } = await adminSupabase
    .from('inspection_items')
    .select('id, inspection_id, template_item_id, status, notes, updated_at')
    .eq('inspection_id', inspectionId)

  // ── DEBUG: remove after confirming data flows correctly ──────────────────
  console.log('[queries] inspection_items rows:', data)
  if (error) {
    console.error('[getInspectionItemsByInspectionId] query error:', error.message, error)
  }
  // ────────────────────────────────────────────────────────────────────────

  if (error) return []

  return data ?? []
}

export async function getPendingInspectionCount(tenantId: string): Promise<number> {
  if (!hasValue(tenantId)) return 0

  const supabase = await createClient()

  const { count, error } = await supabase
    .from('inspections')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_archived', false)          // Phase A: exclude archived from pending count
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

// ── Estimate queries ──────────────────────────────────────────────────────────

/**
 * Returns the most-recent draft estimate for an inspection, or null.
 * "One active draft per inspection" is a soft rule enforced here and in
 * createEstimate() — the DB does not UNIQUE-constrain this intentionally,
 * to allow future revision history.
 */
export async function getEstimateByInspectionId(
  tenantId: string,
  inspectionId: string,
): Promise<Estimate | null> {
  if (!hasValue(tenantId) || !hasValue(inspectionId)) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('estimates')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('inspection_id', inspectionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[getEstimateByInspectionId]', error.message)
    return null
  }

  return (data as Estimate | null) ?? null
}

/**
 * Returns a single estimate by ID with all of its line items and nested parts.
 * Items are sorted by display_order ascending.
 */
export async function getEstimateWithItems(
  tenantId: string,
  estimateId: string,
): Promise<EstimateWithItems | null> {
  if (!hasValue(tenantId) || !hasValue(estimateId)) return null

  const supabase = await createAdminClient()

  const [estimateRes, itemsRes, partsRes] = await Promise.all([
    supabase
      .from('estimates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', estimateId)
      .single(),
    supabase
      .from('estimate_items')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('estimate_id', estimateId)
      .order('display_order', { ascending: true }),
    supabase
      .from('estimate_item_parts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('estimate_id', estimateId)
      .order('display_order', { ascending: true }),
  ])

  if (estimateRes.error) {
    console.error('[getEstimateWithItems estimate]', estimateRes.error.message)
    return null
  }

  if (itemsRes.error) {
    console.error('[getEstimateWithItems items]', itemsRes.error.message)
  }

  // Parts errors are non-fatal — estimate still loads without parts
  if (partsRes.error) {
    console.error('[getEstimateWithItems parts]', partsRes.error.message)
  }

  const estimate = estimateRes.data as Estimate
  const rawItems = (itemsRes.data ?? []) as EstimateItem[]
  const parts    = (partsRes.data ?? []) as EstimateItemPart[]

  console.log('[getEstimateWithItems] loaded', {
    estimateId,
    itemCount: rawItems.length,
    partsCount: parts.length,
    itemIds: rawItems.map(i => i.id),
    itemServiceRecIds: rawItems.map(i => i.service_recommendation_id),
  })

  // Nest parts under their parent item
  const partsMap = new Map<string, EstimateItemPart[]>()
  for (const part of parts) {
    const bucket = partsMap.get(part.estimate_item_id) ?? []
    bucket.push(part)
    partsMap.set(part.estimate_item_id, bucket)
  }

  const items = rawItems.map(item => ({
    ...item,
    parts: partsMap.get(item.id) ?? [],
  }))

  return { ...estimate, items }
}

/**
 * Returns all estimates for a tenant, newest first.
 * Does not load line items — use getEstimateWithItems() for detail views.
 */
export async function getEstimatesByTenant(
  tenantId: string,
): Promise<Estimate[]> {
  if (!hasValue(tenantId)) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('estimates')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_archived', false)          // Phase A: hide archived records from list
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getEstimatesByTenant]', error.message)
    return []
  }

  return (data ?? []) as Estimate[]
}

/**
 * Returns all line items for an estimate, sorted by display_order.
 */
export async function getEstimateItems(
  tenantId: string,
  estimateId: string,
): Promise<EstimateItem[]> {
  if (!hasValue(tenantId) || !hasValue(estimateId)) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('estimate_items')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('estimate_id', estimateId)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('[getEstimateItems]', error.message)
    return []
  }

  return (data ?? []) as EstimateItem[]
}

// ── Service jobs catalog ──────────────────────────────────────

/**
 * Returns all active service jobs joined with their category, sorted by
 * category sort_order then job name.  Used to populate the job dropdown
 * in the estimate editor.
 *
 * These are global reference rows (no tenant_id).
 */
export async function getServiceJobs(): Promise<ServiceJobWithCategory[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('service_jobs')
    .select(`
      *,
      category:service_categories(id, name, sort_order)
    `)
    .eq('is_active', true)
    .order('category_id')
    .order('name')

  if (error) {
    console.error('[getServiceJobs]', error.message)
    return []
  }

  // Sort by category sort_order so the dropdown groups appear in the right order
  const rows = (data ?? []) as ServiceJobWithCategory[]
  return rows.sort((a, b) => {
    const catDiff = (a.category?.sort_order ?? 0) - (b.category?.sort_order ?? 0)
    if (catDiff !== 0) return catDiff
    return a.name.localeCompare(b.name)
  })
}

// ── Tenant pricing config ──────────────────────────────────────

/**
 * Returns the tenant's pricing configuration, or null if none has been saved yet.
 * Used by createEstimate() to pre-fill default_tax_rate on new estimates.
 */
export async function getTenantPricingConfig(
  tenantId: string,
): Promise<TenantPricingConfig | null> {
  if (!hasValue(tenantId)) return null

  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('tenant_pricing_configs')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    console.error('[getTenantPricingConfig]', error.message)
    return null
  }

  return (data as TenantPricingConfig | null) ?? null
}

/**
 * Returns all persisted advisor decisions for a given estimate.
 * Items with no row in this table are still pending (no decision yet).
 * Sorted by decided_at so the most recent decisions come first.
 */
export async function getEstimateItemDecisions(
  tenantId:   string,
  estimateId: string,
): Promise<EstimateItemDecision[]> {
  if (!hasValue(tenantId) || !hasValue(estimateId)) return []

  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('estimate_item_decisions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('estimate_id', estimateId)
    .order('decided_at', { ascending: false })

  if (error) {
    console.error('[getEstimateItemDecisions]', error.message)
    return []
  }

  return (data ?? []) as EstimateItemDecision[]
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

// ── Work orders ────────────────────────────────────────────────

/**
 * Fetch all work orders for a tenant, ordered by creation date descending.
 * Does NOT include line items — use getWorkOrderById for that.
 */
export async function getWorkOrdersForTenant(tenantId: string, limit = 200): Promise<WorkOrder[]> {
  if (!hasValue(tenantId)) return []

  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('work_orders')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_archived', false)          // Phase A: hide archived records from list
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getWorkOrdersForTenant]', error.message)
    return []
  }

  return (data ?? []) as WorkOrder[]
}

/**
 * Fetch a single work order by ID, including all its line items.
 * Returns null if not found or auth check fails.
 */
export async function getWorkOrderById(
  tenantId: string,
  workOrderId: string,
): Promise<WorkOrderWithItems | null> {
  if (!hasValue(tenantId) || !hasValue(workOrderId)) return null

  const supabase = await createAdminClient()

  // Fetch work order header
  const { data: woData, error: woError } = await supabase
    .from('work_orders')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', workOrderId)
    .single()

  if (woError) {
    console.error('[getWorkOrderById] work_orders query:', woError.message)
    return null
  }

  if (!woData) return null

  // Fetch work order items
  const { data: itemsData, error: itemsError } = await supabase
    .from('work_order_items')
    .select('*')
    .eq('work_order_id', workOrderId)
    .order('display_order', { ascending: true })

  if (itemsError) {
    console.error('[getWorkOrderById] work_order_items query:', itemsError.message)
    // Return work order without items rather than failing completely
    return { ...(woData as WorkOrder), items: [] }
  }

  if (!itemsData || itemsData.length === 0) {
    return {
      ...(woData as WorkOrder),
      items: [],
    }
  }

  // Fetch parts for all items (from their source estimate items)
  const estimateItemIds = (itemsData as WorkOrderItem[])
    .map(item => item.estimate_item_id)
    .filter(Boolean)

  let partsMap = new Map<string, any[]>()
  if (estimateItemIds.length > 0) {
    const { data: partsData, error: partsError } = await supabase
      .from('estimate_item_parts')
      .select('*')
      .in('estimate_item_id', estimateItemIds)
      .order('display_order', { ascending: true })

    if (partsError) {
      console.error('[getWorkOrderById] estimate_item_parts query:', partsError.message)
      // Graceful degradation: continue without parts data
    } else if (partsData) {
      for (const part of partsData) {
        const bucket = partsMap.get(part.estimate_item_id) ?? []
        bucket.push(part)
        partsMap.set(part.estimate_item_id, bucket)
      }
    }
  }

  // Nest parts under their parent item
  const itemsWithParts = (itemsData as WorkOrderItem[]).map(item => ({
    ...item,
    parts: item.estimate_item_id ? (partsMap.get(item.estimate_item_id) ?? []) : [],
  }))

  return {
    ...(woData as WorkOrder),
    items: itemsWithParts as any,
  }
}

// ── Invoices ─────────────────────────────────────────────────

/**
 * Fetch a single invoice by ID, including all its line items.
 * Returns null if not found or auth check fails.
 */
export async function getInvoiceById(
  tenantId: string,
  invoiceId: string,
): Promise<InvoiceWithItems | null> {
  if (!hasValue(tenantId) || !hasValue(invoiceId)) return null

  const supabase = await createClient()

  // Fetch invoice header
  const { data: invData, error: invError } = await supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', invoiceId)
    .single()

  if (invError) {
    console.error('[getInvoiceById] invoices query:', invError.message)
    return null
  }

  if (!invData) return null

  // Fetch invoice items
  const { data: itemsData, error: itemsError } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('invoice_id', invoiceId)
    .order('display_order', { ascending: true })

  const itemCount = itemsData?.length ?? 0
  console.log('[getInvoiceById] FETCHED invoice_items:', {
    invoiceId,
    itemCount,
  })

  if (itemsError) {
    console.error('[getInvoiceById] invoice_items query error:', itemsError.message)
    // Return invoice without items rather than failing completely
    return { ...(invData as Invoice), items: [] }
  }

  if (itemCount === 0) {
    console.warn('[getInvoiceById] ⚠️  No invoice_items found for invoice:', invoiceId)
  }

  return {
    ...(invData as Invoice),
    items: (itemsData ?? []) as InvoiceItem[],
  }
}

/**
 * Fetch invoice by work order ID.
 * Returns null if no invoice exists for this work order.
 */
export async function getInvoiceByWorkOrderId(
  tenantId: string,
  workOrderId: string,
): Promise<Invoice | null> {
  if (!hasValue(tenantId) || !hasValue(workOrderId)) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('work_order_id', workOrderId)
    .maybeSingle()

  if (error) {
    console.error('[getInvoiceByWorkOrderId]', error.message)
    return null
  }

  return (data ?? null) as Invoice | null
}

/**
 * Fetch customer name by ID.
 * Used to display customer name on invoices.
 * Combines first_name and last_name into display format.
 */
export async function getCustomerName(customerId: string): Promise<string | null> {
  if (!hasValue(customerId)) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customers')
    .select('first_name, last_name')
    .eq('id', customerId)
    .maybeSingle()

  if (error) {
    console.error('[getCustomerName]', error.message)
    return null
  }

  if (!data) return null

  // Combine first and last names
  const parts = [data.first_name, data.last_name].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : null
}

/**
 * Fetch vehicle display string (e.g., "2014 BMW i3").
 * Used to display vehicle on invoices.
 */
export async function getVehicleDisplay(vehicleId: string): Promise<string | null> {
  if (!hasValue(vehicleId)) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vehicles')
    .select('year, make, model')
    .eq('id', vehicleId)
    .maybeSingle()

  if (error) {
    console.error('[getVehicleDisplay]', error.message)
    return null
  }

  if (!data) return null

  // Build display string: "2014 BMW i3"
  const parts = [data.year, data.make, data.model].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : null
}

// ── Estimate Approval Queries ────────────────────────────────────────

/**
 * Fetch the most recent approval record for an estimate.
 * Returns the latest EstimateApproval if it exists.
 *
 * COMMENTED OUT: Requires EstimateApproval type definition and estimate_approvals table.
 * Currently unused. Re-enable when implementing estimate approval workflow.
 *
export async function getLatestEstimateApproval(
  tenantId: string,
  estimateId: string,
): Promise<any | null> {
  if (!hasValue(tenantId) || !hasValue(estimateId)) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('estimate_approvals')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('estimate_id', estimateId)
    .order('approved_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[getLatestEstimateApproval]', error.message)
    return null
  }

  return (data ?? null) as any | null
}
*/

/**
 * Fetch all approval records for an estimate (audit trail).
 *
 * COMMENTED OUT: Requires EstimateApproval type definition and estimate_approvals table.
 * Currently unused. Re-enable when implementing estimate approval audit trail.
 *
export async function getEstimateApprovalHistory(
  tenantId: string,
  estimateId: string,
): Promise<any[]> {
  if (!hasValue(tenantId) || !hasValue(estimateId)) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('estimate_approvals')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('estimate_id', estimateId)
    .order('approved_at', { ascending: false })

  if (error) {
    console.error('[getEstimateApprovalHistory]', error.message)
    return []
  }

  return (data ?? []) as any[]
}
*/