import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import {
  getEstimateWithItems,
  getEstimateItemDecisions,
  getServiceJobs,
  getTenantPricingConfig,
} from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import { canEditDashboardModule } from '@/lib/auth/roles'
import Topbar from '@/components/dashboard/Topbar'
import EstimateEditor from './EstimateEditor'

export const metadata = { title: 'Estimate' }

export default async function EstimateDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const ctx = await getDashboardTenant()
  if (!ctx) return notFound()

  const tenantId = ctx.tenant.id

  console.log('[EstimateDetailPage] loading estimate', {
    estimateId: params.id,
    tenantId,
  })

  const [estimate, serviceJobs, pricingConfig, initialDecisions] = await Promise.all([
    getEstimateWithItems(tenantId, params.id),
    getServiceJobs(),
    getTenantPricingConfig(tenantId),
    getEstimateItemDecisions(tenantId, params.id),
  ])

  console.log('[EstimateDetailPage] estimate loaded', {
    estimateId: estimate?.id,
    itemCount: estimate?.items?.length ?? 0,
    items: estimate?.items?.map(i => ({ id: i.id, title: i.title })) ?? [],
  })

  if (!estimate) return notFound()

  // Default labor rate: from tenant config, fallback to 0
  const defaultLaborRate = Number(pricingConfig?.default_labor_rate ?? 0)

  // Resolve customer and vehicle display names (best-effort, non-blocking)
  const supabase = await createClient()

  const [customerRes, vehicleRes] = await Promise.all([
    estimate.customer_id
      ? supabase
          .from('customers')
          .select('first_name, last_name')
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

  const customer = customerRes.data as { first_name: string; last_name: string } | null
  const vehicle  = vehicleRes.data  as { year: number | null; make: string | null; model: string | null } | null

  const customerName = customer
    ? `${customer.first_name} ${customer.last_name}`.trim()
    : null

  const vehicleLabel = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')
    : null

  const subtitle = [customerName, vehicleLabel].filter(Boolean).join(' · ') || undefined

  const canEditEstimates = await canEditDashboardModule('estimates')

  return (
    <>
      <Topbar
        title={estimate.estimate_number}
        subtitle={subtitle}
        action={{ label: '← Estimates', href: '/dashboard/estimates' }}
      />
      <EstimateEditor
        estimate={estimate}
        inspectionId={estimate.inspection_id}
        serviceJobs={serviceJobs}
        defaultLaborRate={defaultLaborRate}
        initialDecisions={initialDecisions}
        readOnly={!canEditEstimates}
      />
    </>
  )
}
