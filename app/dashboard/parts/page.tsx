import Link from 'next/link'
import { getDashboardTenant } from '@/lib/tenant'
import { getPartsByTenant } from '@/lib/queries'
import { assertCanAccessDashboardModule, canEditDashboardModule } from '@/lib/auth/roles'
import Topbar from '@/components/dashboard/Topbar'
import { format } from 'date-fns'

export const metadata = { title: 'Parts Catalog' }

export default async function PartsCatalogPage() {
  await assertCanAccessDashboardModule('parts')
  const ctx = await getDashboardTenant()
  const tenantId = ctx?.tenant.id ?? ''
  const parts = tenantId ? await getPartsByTenant(tenantId) : []
  const canEdit = await canEditDashboardModule('parts')

  return (
    <>
      <Topbar
        title="Parts Catalog"
        subtitle="Reusable parts for consistent pricing — no stock counts"
        action={canEdit ? { label: 'Add Part', href: '/dashboard/parts/new' } : undefined}
      />
      <div className="dash-content">
        <div className="table-wrap">
          {parts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">{'\u{1F4E6}'}</div>
              <div className="empty-state-title">No parts in your catalog yet</div>
              <div className="empty-state-body">
                {canEdit
                  ? 'Add common parts with default cost and price so estimates stay consistent.'
                  : 'Your shop has not added any catalog parts.'}
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Part #</th>
                  <th>Name</th>
                  <th>Default cost</th>
                  <th>Default price</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {parts.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {p.part_number?.trim() ? p.part_number : '—'}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{p.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {p.default_unit_cost != null ? `$${Number(p.default_unit_cost).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {p.default_unit_price != null ? `$${Number(p.default_unit_price).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {format(new Date(p.created_at), 'MMM d, yyyy')}
                    </td>
                    <td>
                      {canEdit ? (
                        <Link
                          href={`/dashboard/parts/${p.id}/edit`}
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
