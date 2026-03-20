import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import { getAppointmentById, getCustomers, getVehicles } from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import AppointmentForm from '../../AppointmentForm'

export const metadata = { title: 'Edit Appointment' }

export default async function EditAppointmentPage({
  params,
}: {
  params: { id: string }
}) {
  const ctx = await getDashboardTenant()
  if (!ctx) notFound()

  const [appointment, customers, vehicles] = await Promise.all([
    getAppointmentById(ctx.tenant.id, params.id),
    getCustomers(ctx.tenant.id),
    getVehicles(ctx.tenant.id),
  ])

  if (!appointment) notFound()

  const customerName = appointment.customer
    ? `${appointment.customer.first_name} ${appointment.customer.last_name}`
    : 'Edit Appointment'

  return (
    <>
      <Topbar
        title={customerName}
        subtitle={appointment.appointment_date ?? 'Edit Appointment'}
      />
      <div className="dash-content">
        <div className="card" style={{ maxWidth: 720 }}>
          <AppointmentForm
            appointment={appointment}
            customers={customers}
            vehicles={vehicles}
          />
        </div>
      </div>
    </>
  )
}
