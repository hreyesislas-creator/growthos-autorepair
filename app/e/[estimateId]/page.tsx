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

  const estimate = estimateRes.data
  if (!estimate) return notFound()

  // Extract existing work order ID if one exists
  const existingWorkOrderId = workOrderRes.data?.id ?? undefined

  // ── 2. Parallel data fetches ───────────────────────────────────────────────
  const [itemsRes, customerRes, vehicleRes, tenantRes, profileRes, recsRes] =
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

      // Business profile (phone, logo)
      supabase
        .from('business_profiles')
        .select('phone, logo_url')
        .eq('tenant_id', (estimate as any).tenant_id)
        .maybeSingle(),

      // Inspection findings (all recommendations from the linked inspection)
      (estimate as any).inspection_id
        ? supabase
            .from('service_recommendations')
            .select(
              'id, title, description, technician_notes, ' +
              'source_status, priority, item_name, section_name, estimated_price',
            )
            .eq('inspection_id', (estimate as any).inspection_id)
        : Promise.resolve({ data: [] }),
    ])

  // ── 3. Shape data ──────────────────────────────────────────────────────────
  const shopName  = tenantRes.data?.name ?? 'Your Auto Shop'
  const customer  = customerRes.data as { first_name: string; last_name: string; phone: string | null; email: string | null } | null
  const vehicle   = vehicleRes.data  as { year: number | null; make: string | null; model: string | null; license_plate: string | null } | null

  const customerName = customer
    ? `${customer.first_name} ${customer.last_name}`.trim()
    : null
  const customerPhone = customer?.phone ?? null

  const vehicleLabel = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')
    : null

  // Build EstimateWithItems
  const estimateWithItems = Object.assign({}, estimate, { items: itemsRes.data ?? [] }) as unknown as Parameters<typeof PresentationView>[0]['estimate']

  // Convert decisions to initial state
  const initialDecisions = (decisionRes.data ?? []) as unknown as Parameters<typeof PresentationView>[0]['initialDecisions']

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
    />
  )
}
