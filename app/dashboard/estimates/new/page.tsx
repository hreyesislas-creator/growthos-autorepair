import { assertCanEditDashboardModule } from '@/lib/auth/roles'
import { getDashboardTenant } from '@/lib/tenant'
import { getCustomers, getVehicles } from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import NewEstimateForm from './NewEstimateForm'

export const metadata = { title: 'New Estimate' }

export default async function NewEstimatePage() {
  await assertCanEditDashboardModule('estimates')
  const ctx      = await getDashboardTenant()
  const tenantId = ctx?.tenant.id ?? ''

  const [customers, vehicles] = await Promise.all([
    getCustomers(tenantId),
    getVehicles(tenantId),
  ])

  return (
    <>
      <Topbar title="New Estimate" />
      <div className="dash-content">
        <div className="card" style={{ maxWidth: 560 }}>
          <NewEstimateForm customers={customers} vehicles={vehicles} />
        </div>
      </div>
    </>
  )
}
