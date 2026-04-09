import { getDashboardTenant } from '@/lib/tenant'
import { getVehicles } from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import Link from 'next/link'
import { format } from 'date-fns'

export const metadata = { title: 'Vehicles' }

export default async function VehiclesPage() {
  const ctx      = await getDashboardTenant()
  const tenantId = ctx?.tenant.id ?? ''
  const vehicles = await getVehicles(tenantId)

  return (
    <>
      <Topbar title="Vehicles" action={{ label: 'Add Vehicle', href: '/dashboard/vehicles/new' }} />
      <div className="dash-content">
        <div className="table-wrap">
          {vehicles.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🚗</div>
              <div className="empty-state-title">No vehicles yet</div>
              <div className="empty-state-body">Add vehicles to track service history and inspections.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Make</th>
                  <th>Model</th>
                  <th>VIN</th>
                  <th>License Plate</th>
                  <th>Mileage</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{v.year ?? '—'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{v.make ?? '—'}</td>
                    <td>{v.model ?? '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>
                      {v.vin ? v.vin.slice(-8) : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{v.license_plate ?? '—'}</td>
                    <td>{v.mileage ? v.mileage.toLocaleString() : '—'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                      {format(new Date(v.created_at), 'MMM d, yyyy')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link
                          href={`/dashboard/vehicles/${v.id}`}
                          className="btn-ghost"
                          style={{ padding: '3px 10px', fontSize: '12px' }}
                        >
                          View
                        </Link>
                        <Link
                          href={`/dashboard/vehicles/${v.id}/edit`}
                          className="btn-ghost"
                          style={{ padding: '3px 10px', fontSize: '12px' }}
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* VIN entry note */}
        <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', fontSize: '13px', color: 'var(--text-3)' }}>
          <strong style={{ color: 'var(--text-2)' }}>VIN Entry:</strong> Manual VIN entry is available when adding a vehicle. VIN scan from phone is coming in a future update.
        </div>
      </div>
    </>
  )
}
