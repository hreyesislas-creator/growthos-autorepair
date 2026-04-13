/**
 * Public customer-facing estimate presentation page.
 * Route: /e/[estimateId]
 *
 * No authentication required. The estimate UUID is the access token.
 * Data is fetched using the service-role admin client (bypasses RLS).
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import PresentationView from './PresentationView'

// Local type for estimate row (matches selected fields in this page)
interface EstimateData {
  id: string
  tenant_id: string
  customer_id: string | null
  vehicle_id: string | null
  inspection_id: string | null
  estimate_number: string
  status: string
  notes: string | null
  subtotal: number | string
  tax_rate: number | string | null
  tax_amount: number | string
  total: number | string
  created_at: string
  updated_at: string
}

// Local type for business_profiles shape (matches selected fields in this page)
interface BusinessProfileData {
  business_name: string | null
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  phone: string | null
  email: string | null
  website: string | null
  logo_url: string | null
  warranty_text: string | null
  invoice_footer: string | null
}

// Local type for estimate_items shape (matches selected fields in this page)
interface EstimateItemData {
  id: string
  title: string
  description: string | null
  notes: string | null
  category: string
  source_type: string
  service_job_id: string | null
  labor_hours: number | null
  labor_rate: number | null
  labor_total: number | null
  parts_total: number | null
  line_total: number | null
  display_order: number
  estimate_id: string
  tenant_id: string
  quantity: number
  unit_price: number
  needs_review: boolean | null
  service_recommendation_id: string | null
  inspection_item_id: string | null
  created_at: string
  updated_at: string
}

// Always fetch fresh — status can change (approved/declined)
export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: { estimateId: string }
}): Promise<Metadata> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('estimates')
    .select('estimate_number, tenant_id')
    .eq('id', params.estimateId)
    .maybeSingle()

  if (!data) return { title: 'Estimate' }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', data.tenant_id)
    .single()

  return {
    title: `Estimate ${data.estimate_number} · ${tenant?.name ?? 'Auto Repair'}`,
    robots: { index: false, follow: false }, // never index customer pages
  }
}

export default async function EstimatePresentationPage({
  params,
}: {
  params: { estimateId: string }
}) {
  const supabase = createAdminClient()

  // ── 1. Fetch estimate header + items ───────────────────────────────────────
  const [estimateRes, decisionRes, workOrderRes] = await Promise.all([
    supabase
      .from('estimates')
      .select(
        'id, tenant_id, customer_id, vehicle_id, inspection_id, ' +
        'estimate_number, status, notes, subtotal, tax_rate, tax_amount, total, ' +
        'created_at, updated_at',
      )
      .eq('id', params.estimateId)
      .maybeSingle(),
    // Fetch item decisions (for per-job approval state)
    supabase
      .from('estimate_item_decisions')
      .select('id, tenant_id, estimate_id, estimate_item_id, decision, decided_by, decided_at, created_at, updated_at')
      .eq('estimate_id', params.estimateId),
    // Fetch existing work order (for persistence after reload)
    supabase
      .from('work_orders')
      .select('id')
      .eq('estimate_id', params.estimateId)
      .maybeSingle(),
  ])

  const estimate = estimateRes.data as EstimateData | null
  if (!estimate) return notFound()

  // Log decision query errors (critical for rehydrating saved state)
  if (decisionRes.error) {
    console.error('[EstimatePresentationPage] decision query failed:', decisionRes.error.message)
  }

  // Extract existing work order ID if one exists
  const existingWorkOrderId = workOrderRes.data?.id ?? undefined

  // ── 2. Parallel data fetches ───────────────────────────────────────────────
  const [itemsRes, partsRes, customerRes, vehicleRes, tenantRes, profileRes, recsRes] =
    await Promise.all([

      // Estimate line items (with full details for per-job approval)
      supabase
        .from('estimate_items')
        .select(
          'id, title, description, notes, category, source_type, ' +
          'service_job_id, labor_hours, labor_rate, labor_total, parts_total, line_total, ' +
          'display_order, estimate_id, tenant_id, quantity, unit_price, needs_review, service_recommendation_id, inspection_item_id, created_at, updated_at',
        )
        .eq('estimate_id', params.estimateId)
        .order('display_order'),

      // Estimate item parts (nested breakdown for each item)
      supabase
        .from('estimate_item_parts')
        .select('*')
        .eq('estimate_id', params.estimateId)
        .order('display_order', { ascending: true }),

      // Customer
      (estimate as any).customer_id
        ? supabase
            .from('customers')
            .select('first_name, last_name, phone, email')
            .eq('id', (estimate as any).customer_id)
            .single()
        : Promise.resolve({ data: null }),

      // Vehicle
      (estimate as any).vehicle_id
        ? supabase
            .from('vehicles')
            .select('year, make, model, license_plate')
            .eq('id', (estimate as any).vehicle_id)
            .single()
        : Promise.resolve({ data: null }),

      // Tenant (shop name)
      supabase
        .from('tenants')
        .select('name')
        .eq('id', (estimate as any).tenant_id)
        .single(),

      // Business profile (all fields for header + footer)
      supabase
        .from('business_profiles')
        .select(
          'business_name, address_line_1, address_line_2, city, state, zip_code, ' +
          'phone, email, website, logo_url, warranty_text, invoice_footer',
        )
        .eq('tenant_id', (estimate as any).tenant_id)
        .maybeSingle(),

      // Inspection findings (all recommendations from the linked inspection).
      // Only selects columns confirmed to exist in the live schema.
      (estimate as any).inspection_id
        ? supabase
            .from('service_recommendations')
            .select('id, title, description, item_name, priority, status, estimated_price')
            .eq('inspection_id', (estimate as any).inspection_id)
        : Promise.resolve({ data: [] }),
    ])

  // ── 3. Shape data ──────────────────────────────────────────────────────────
  const profile   = profileRes.data as BusinessProfileData | null
  const shopName  = profile?.business_name ?? tenantRes.data?.name ?? 'Your Auto Shop'
  const customer  = customerRes.data as { first_name: string; last_name: string; phone: string | null; email: string | null } | null
  const vehicle   = vehicleRes.data  as { year: number | null; make: string | null; model: string | null; license_plate: string | null } | null

  const customerName = customer
    ? `${customer.first_name} ${customer.last_name}`.trim()
    : null
  const customerPhone = customer?.phone ?? null

  const vehicleLabel = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')
    : null

  // Nest parts under their parent item
  const partsMap = new Map<string, any[]>()
  for (const part of partsRes.data ?? []) {
    const bucket = partsMap.get(part.estimate_item_id) ?? []
    bucket.push(part)
    partsMap.set(part.estimate_item_id, bucket)
  }

  const estimateItems = ((itemsRes.data as unknown as EstimateItemData[]) ?? [])
  const itemsWithParts = estimateItems.map(item => ({
    ...item,
    parts: partsMap.get(item.id) ?? [],
  }))

  // Build EstimateWithItems
  const estimateWithItems = Object.assign({}, estimate, { items: itemsWithParts }) as unknown as Parameters<typeof PresentationView>[0]['estimate']

  // Convert decisions to initial state
  const initialDecisions = (decisionRes.data ?? []) as unknown as Parameters<typeof PresentationView>[0]['initialDecisions']

  // Log decision state for debugging (helps detect silent failures on reload)
  console.log('[EstimatePresentationPage] decisions loaded:', {
    estimateId: params.estimateId,
    decisionCount: Array.isArray(initialDecisions) ? initialDecisions.length : 0,
    hasError: !!decisionRes.error,
    workOrderExists: !!existingWorkOrderId,
  })


  return (
    <PresentationView
      estimate={estimateWithItems}
      estimateId={params.estimateId}
      customerName={customerName}
      vehicleLabel={vehicleLabel}
      shopName={shopName}
      customerPhone={customerPhone}
      initialDecisions={initialDecisions}
      existingWorkOrderId={existingWorkOrderId}
      profile={profile}
      isLocked={estimate.status === 'authorized' || estimate.status === 'approved' || estimate.status === 'declined'}
      recommendations={(recsRes.data ?? []) as any[]}
    />
  )
}
