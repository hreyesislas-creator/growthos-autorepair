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
import CustomerPresentation from './CustomerPresentation'

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

  // ── 1. Fetch estimate header ───────────────────────────────────────────────
  const { data: estimate } = await supabase
    .from('estimates')
    .select(
      'id, tenant_id, customer_id, vehicle_id, inspection_id, ' +
      'estimate_number, status, notes, subtotal, tax_rate, tax_amount, total, ' +
      'created_at, updated_at',
    )
    .eq('id', params.estimateId)
    .maybeSingle()

  if (!estimate) return notFound()

  // ── 2. Parallel data fetches ───────────────────────────────────────────────
  const [itemsRes, customerRes, vehicleRes, tenantRes, profileRes, recsRes] =
    await Promise.all([

      // Estimate line items (non-internal)
      supabase
        .from('estimate_items')
        .select(
          'id, title, description, notes, category, source_type, ' +
          'service_job_id, labor_hours, labor_rate, labor_total, parts_total, line_total, ' +
          'display_order',
        )
        .eq('estimate_id', params.estimateId)
        .order('display_order'),

      // Customer
      estimate.customer_id
        ? supabase
            .from('customers')
            .select('first_name, last_name, phone, email')
            .eq('id', estimate.customer_id)
            .single()
        : Promise.resolve({ data: null }),

      // Vehicle
      estimate.vehicle_id
        ? supabase
            .from('vehicles')
            .select('year, make, model, license_plate')
            .eq('id', estimate.vehicle_id)
            .single()
        : Promise.resolve({ data: null }),

      // Tenant (shop name)
      supabase
        .from('tenants')
        .select('name')
        .eq('id', estimate.tenant_id)
        .single(),

      // Business profile (phone, logo)
      supabase
        .from('business_profiles')
        .select('phone, logo_url')
        .eq('tenant_id', estimate.tenant_id)
        .maybeSingle(),

      // Inspection findings (all recommendations from the linked inspection)
      estimate.inspection_id
        ? supabase
            .from('service_recommendations')
            .select(
              'id, title, description, technician_notes, ' +
              'source_status, priority, item_name, section_name, estimated_price',
            )
            .eq('inspection_id', estimate.inspection_id)
        : Promise.resolve({ data: [] }),
    ])

  // ── 3. Shape data ──────────────────────────────────────────────────────────
  const shopName  = tenantRes.data?.name ?? 'Your Auto Shop'
  const shopPhone = (profileRes.data as { phone?: string | null } | null)?.phone ?? null
  const logoUrl   = (profileRes.data as { logo_url?: string | null } | null)?.logo_url ?? null

  return (
    <CustomerPresentation
      estimate={estimate as Parameters<typeof CustomerPresentation>[0]['estimate']}
      items={(itemsRes.data ?? []) as Parameters<typeof CustomerPresentation>[0]['items']}
      customer={(customerRes.data ?? null) as Parameters<typeof CustomerPresentation>[0]['customer']}
      vehicle={(vehicleRes.data ?? null) as Parameters<typeof CustomerPresentation>[0]['vehicle']}
      shopName={shopName}
      shopPhone={shopPhone}
      logoUrl={logoUrl}
      recommendations={(recsRes.data ?? []) as Parameters<typeof CustomerPresentation>[0]['recommendations']}
    />
  )
}
