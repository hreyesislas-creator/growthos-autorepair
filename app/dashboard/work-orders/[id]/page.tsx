import { notFound }           from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import { getWorkOrderById }   from '@/lib/queries'
import { createClient }       from '@/lib/supabase/server'
import Topbar                 from '@/components/dashboard/Topbar'
import WorkOrderDetail        from './WorkOrderDetail'

export const metadata = { title: 'Work Order' }

export default async function WorkOrderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const ctx = await getDashboardTenant()
  if (!ctx) return notFound()

  const tenantId = ctx.tenant.id

  // ── Load work order with items ─────────────────────────────────────────────
  const workOrder = await getWorkOrderById(tenantId, params.id)
  if (!workOrder) return notFound()

  // ── Resolve customer and vehicle display labels ────────────────────────────
  const supabase = await createClient()

  const [customerRes, vehicleRes] = await Promise.all([
    workOrder.customer_id
      ? supabase
          .from('customers')
          .select('first_name, last_name')
          .eq('tenant_id', tenantId)
          .eq('id', workOrder.customer_id)
          .single()
      : Promise.resolve({ data: null }),
    workOrder.vehicle_id
      ? supabase
          .from('vehicles')
          .select('year, make, model')
          .eq('tenant_id', tenantId)
          .eq('id', workOrder.vehicle_id)
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

  return (
    <>
      <Topbar
        title={workOrder.work_order_number ?? 'Work Order'}
        subtitle={subtitle}
        action={{ label: '← Work Orders', href: '/dashboard/work-orders' }}
      />
      <WorkOrderDetail
        workOrder={workOrder}
        customerName={customerName}
        vehicleLabel={vehicleLabel}
      />
    </>
  )
}
