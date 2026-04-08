import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import {
  getEstimateWithItems,
  getTenantPricingConfig,
  getEstimateItemDecisions,
} from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/dashboard/Topbar'
import PresentationView from './PresentationView'

export const metadata = { title: 'Internal Review (Advisor Only)' }

export default async function EstimatePresentPage({
  params,
}: {
  params: { id: string }
}) {
  const ctx = await getDashboardTenant()
  if (!ctx) return notFound()

  const tenantId = ctx.tenant.id

  const [estimate, pricingConfig, initialDecisions] = await Promise.all([
    getEstimateWithItems(tenantId, params.id),
    getTenantPricingConfig(tenantId),
    getEstimateItemDecisions(tenantId, params.id),
  ])

  if (!estimate) return notFound()

  // Resolve customer and vehicle display names (best-effort, non-blocking)
  const supabase = await createClient()

  const [customerRes, vehicleRes] = await Promise.all([
    estimate.customer_id
      ? supabase
          .from('customers')
          .select('first_name, last_name, phone')
          .eq('tenant_id', tenantId)
          .eq('id', estimate.customer_id)
          .single()
      : Promise.resolve({ data: null }),
    estimate.vehicle_id
      ? supabase
          .from('vehicles')
          .select('year, make, model')
          .eq('tenant_id', tenantId)
          .eq('id', estimate.vehicle_id)
          .single()
      : Promise.resolve({ data: null }),
  ])

  const customer = customerRes.data as { first_name: string; last_name: string; phone: string | null } | null
  const vehicle  = vehicleRes.data  as { year: number | null; make: string | null; model: string | null } | null

  const customerName  = customer
    ? `${customer.first_name} ${customer.last_name}`.trim()
    : null
  const customerPhone = customer?.phone ?? null

  const vehicleLabel = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')
    : null

  return (
    <>
      <Topbar
        title="Internal Review (Advisor Only)"
        subtitle={[estimate.estimate_number, customerName, vehicleLabel]
          .filter(Boolean)
          .join(' · ') || undefined}
        action={{ label: '← Estimate', href: `/dashboard/estimates/${params.id}` }}
      />
      <PresentationView
        estimate={estimate}
        estimateId={params.id}
        customerName={customerName}
        vehicleLabel={vehicleLabel}
        shopName={ctx.tenant.name}
        customerPhone={customerPhone}
        initialDecisions={initialDecisions}
      />
    </>
  )
}
