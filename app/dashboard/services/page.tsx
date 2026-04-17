import Link from 'next/link'
import { getDashboardTenant } from '@/lib/tenant'
import { getServicesByTenant } from '@/lib/queries'
import { canEditDashboardModule } from '@/lib/auth/roles'
import Topbar from '@/components/dashboard/Topbar'
import { format } from 'date-fns'

export const metadata = { title: 'Job Templates' }

export default async function ServicesCatalogPage() {
  const ctx = await getDashboardTenant()
  const tenantId = ctx?.tenant.id ?? ''
  const services = tenantId ? await getServicesByTenant(tenantId) : []
  const canEdit = await canEditDashboardModule('estimates')

  return (
    <>
      <Topbar
        title="Job Templates"
        subtitle="Prebuilt packages for faster estimates"
        action={canEdit ? { label: 'New Job Template', href: '/dashboard/services/new' } : undefined}
      />
      <div className="dash-content">
        <div className="table-wrap">
          {services.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">{'\u{1F4C4}'}</div>
              <div className="empty-state-title">No job templates yet</div>
              <div className="empty-state-body">
                {canEdit
                  ? 'Create templates for common jobs (oil change, brakes, etc.), then insert them from an estimate.'
                  : 'Your shop has not defined any job templates.'}
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Labor (h)</th>
                  <th>Rate</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {services.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{s.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {s.default_labor_hours != null ? s.default_labor_hours : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {s.default_labor_rate != null ? `$${Number(s.default_labor_rate).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {format(new Date(s.created_at), 'MMM d, yyyy')}
                    </td>
                    <td>
                      {canEdit ? (
                        <Link
                          href={`/dashboard/services/${s.id}/edit`}
                          className="btn-ghost"
                          style={{ padding: '3px 10px', fontSize: 12 }}
                        >
                          Edit
                        </Link>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
