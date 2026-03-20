import { getAllTenants, getSupportTickets } from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import StatusBadge from '@/components/dashboard/StatusBadge'
import Link from 'next/link'

export const metadata = { title: 'GrowthOS Admin Overview' }

export default async function AdminOverviewPage() {
  const [tenants, tickets] = await Promise.all([
    getAllTenants(),
    getSupportTickets(),
  ])

  const byStatus = tenants.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1
    return acc
  }, {})

  const kpis = [
    { label: 'Total Clients',  value: tenants.length,              sub: 'all tenants',     color: 'var(--text)' },
    { label: 'Active',         value: byStatus.active ?? 0,        sub: 'paying',          color: 'var(--green)' },
    { label: 'Trial',          value: byStatus.trial ?? 0,         sub: 'onboarding',      color: 'var(--yellow)' },
    { label: 'Past Due',       value: byStatus.past_due ?? 0,      sub: 'needs attention', color: 'var(--red)' },
    { label: 'Suspended',      value: byStatus.suspended ?? 0,     sub: 'inactive',        color: 'var(--red)' },
    { label: 'Open Tickets',   value: tickets.filter(t => t.status === "open").length, sub: 'support', color: 'var(--yellow)' },
  ]

  return (
    <>
      <Topbar title="GrowthOS Admin" subtitle="Platform Overview" />
      <div className="dash-content">

        <div className="kpi-grid">
          {kpis.map(k => (
            <div key={k.label} className="kpi-card">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
              <div className="kpi-sub">{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="two-col">
          <div className="card">
            <div className="section-header">
              <div className="section-title">Recent Tenants</div>
              <Link href="/admin/tenants" className="btn-ghost">All tenants</Link>
            </div>
            {tenants.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏢</div>
                <div className="empty-state-title">No tenants yet</div>
              </div>
            ) : (
              <div className="table-wrap" style={{ border: "none" }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Slug</th><th>Name</th><th>Plan</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {tenants.slice(0, 10).map(t => (
                      <tr key={t.id}>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-3)" }}>{t.slug}</td>
                        <td style={{ fontWeight: 600, color: "var(--text)" }}>{t.name}</td>
                        <td><span className="badge badge-blue">{t.plan}</span></td>
                        <td><StatusBadge status={t.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <div className="section-header">
              <div className="section-title">Support Tickets</div>
              <Link href="/admin/support" className="btn-ghost">All tickets</Link>
            </div>
            {tickets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🎫</div>
                <div className="empty-state-title">No open tickets</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {tickets.slice(0, 5).map(t => (
                  <div key={t.id} className="card-sm">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text)" }}>{t.subject}</div>
                      <StatusBadge status={t.status} />
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "4px" }}>
                      {t.priority} priority
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  )
}
