import { getDashboardTenant } from '@/lib/tenant'
import { getAppointments } from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import StatusBadge from '@/components/dashboard/StatusBadge'
import Link from 'next/link'
import { format } from 'date-fns'

export const metadata = { title: 'Appointments' }

export default async function AppointmentsPage() {
  const ctx      = await getDashboardTenant()
  const tenantId = ctx?.tenant.id ?? ''
  const appts    = await getAppointments(tenantId, 100)

  return (
    <>
      <Topbar title="Appointments" action={{ label: 'New Appointment', href: '/dashboard/appointments/new' }} />
      <div className="dash-content">
        <div className="table-wrap">
          {appts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-title">No appointments yet</div>
              <div className="empty-state-body">Add your first appointment to get started.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {appts.map(a => {
                  const dateStr = a.appointment_date
                    ? format(new Date(`${a.appointment_date}T00:00:00`), 'MMM d, yyyy')
                    : '—'
                  const timeStr = a.appointment_time
                    ? format(new Date(`2000-01-01T${a.appointment_time}`), 'h:mm a')
                    : ''
                  return (
                    <tr key={a.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>
                        {dateStr}{timeStr ? ` · ${timeStr}` : ''}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                        {a.customer ? `${a.customer.first_name} ${a.customer.last_name}` : '—'}
                      </td>
                      <td>
                        {a.vehicle
                          ? `${a.vehicle.year ?? ''} ${a.vehicle.make ?? ''} ${a.vehicle.model ?? ''}`.trim() || '—'
                          : '—'}
                      </td>
                      <td>{a.requested_service ?? '—'}</td>
                      <td><StatusBadge status={a.status} /></td>
                      <td><span className="badge badge-gray">{a.source}</span></td>
                      <td>
                        <Link
                          href={`/dashboard/appointments/${a.id}/edit`}
                          className="btn-ghost"
                          style={{ padding: '3px 10px', fontSize: '12px' }}
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
