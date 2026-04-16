import { getDashboardTenant } from '@/lib/tenant'
import { getCustomers } from '@/lib/queries'
import { canEditDashboardModule } from '@/lib/auth/roles'
import Topbar from '@/components/dashboard/Topbar'
import StatusBadge from '@/components/dashboard/StatusBadge'
import Link from 'next/link'
import { format } from 'date-fns'

export const metadata = { title: 'Customers' }

export default async function CustomersPage() {
  const ctx       = await getDashboardTenant()
  const tenantId  = ctx?.tenant.id ?? ''
  const customers = await getCustomers(tenantId)
  const canEdit     = await canEditDashboardModule('customers')

  return (
    <>
      <Topbar
        title="Customers"
        action={canEdit ? { label: 'Add Customer', href: '/dashboard/customers/new' } : undefined}
      />
      <div className="dash-content">
        <div className="table-wrap">
          {customers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">No customers yet</div>
              <div className="empty-state-body">Add your first customer to get started.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {c.first_name} {c.last_name}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{c.phone ?? '—'}</td>
                    <td>{c.email ?? '—'}</td>
                    <td><StatusBadge status={c.is_active ? 'active' : 'inactive'} /></td>
                    <td style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                      {format(new Date(c.created_at), 'MMM d, yyyy')}
                    </td>
                    <td>
                      {canEdit ? (
                        <Link
                          href={`/dashboard/customers/${c.id}/edit`}
                          className="btn-ghost"
                          style={{ padding: '3px 10px', fontSize: '12px' }}
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
