import { getDashboardTenant } from '@/lib/tenant'
import { getCustomers, getVehicles } from '@/lib/queries'
import { assertCanEditDashboardModule } from '@/lib/auth/roles'
import Topbar from '@/components/dashboard/Topbar'
import AppointmentForm from '../AppointmentForm'

export const metadata = { title: 'New Appointment' }

export default async function NewAppointmentPage() {
  await assertCanEditDashboardModule('appointments')
  const ctx      = await getDashboardTenant()
  const tenantId = ctx?.tenant.id ?? ''

  const [customers, vehicles] = await Promise.all([
    getCustomers(tenantId),
    getVehicles(tenantId),
  ])

  return (
    <>
      <Topbar title="New Appointment" />
      <div className="dash-content">
        <div className="card" style={{ maxWidth: 720 }}>
          <AppointmentForm customers={customers} vehicles={vehicles} />
        </div>
      </div>
    </>
  )
}
