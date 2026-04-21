import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import {
  getInspectionById,
  getInspectionRecommendations,
  getCustomerById,
  getVehicleById,
} from '@/lib/queries'
import { getCurrentAppRoleForTenant } from '@/lib/auth/roles'
import { getCurrentDashboardTenantUser } from '@/lib/auth/operational-assignment'
import CustomerReport from './CustomerReport'

export const metadata = { title: 'Vehicle Inspection Report' }

export default async function CustomerReportPage({
  params,
}: {
  params: { id: string }
}) {
  const ctx = await getDashboardTenant()
  if (!ctx) return notFound()

  const tenantId = ctx.tenant.id

  const [role, dashboardDu] = await Promise.all([
    getCurrentAppRoleForTenant(),
    getCurrentDashboardTenantUser(),
  ])
  if (role === 'technician' && !dashboardDu?.tenantUserId) return notFound()

  const inspectionByIdOpts =
    role === 'technician' && dashboardDu?.tenantUserId
      ? { technicianIdEq: dashboardDu.tenantUserId }
      : undefined

  const { inspection } = await getInspectionById(tenantId, params.id, inspectionByIdOpts)
  if (!inspection) return notFound()

  const recommendations = await getInspectionRecommendations(tenantId, params.id)

  // ── Step 2: fetch customer + vehicle in parallel (both may be null)
  const [customer, vehicle] = await Promise.all([
    inspection.customer_id
      ? getCustomerById(tenantId, inspection.customer_id)
      : Promise.resolve(null),
    inspection.vehicle_id
      ? getVehicleById(tenantId, inspection.vehicle_id)
      : Promise.resolve(null),
  ])

  return (
    <CustomerReport
      inspection={inspection}
      recommendations={recommendations}
      customer={customer}
      vehicle={vehicle}
      profile={ctx.profile}
      inspectionId={params.id}
    />
  )
}
