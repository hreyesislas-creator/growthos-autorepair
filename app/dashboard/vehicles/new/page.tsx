import { getDashboardTenant } from '@/lib/tenant'
import { getCustomers } from '@/lib/queries'
import { assertCanEditDashboardModule } from '@/lib/auth/roles'
import Topbar from '@/components/dashboard/Topbar'
import VehicleForm from '../VehicleForm'

export const metadata = { title: 'Add Vehicle' }

export default async function NewVehiclePage() {
  await assertCanEditDashboardModule('vehicles')
  const ctx       = await getDashboardTenant()
  const customers = await getCustomers(ctx?.tenant.id ?? '')

  return (
    <>
      <Topbar title="Add Vehicle" />
      <div className="dash-content">
        <div className="card" style={{ maxWidth: 720 }}>
          <VehicleForm customers={customers} />
        </div>
      </div>
    </>
  )
}
