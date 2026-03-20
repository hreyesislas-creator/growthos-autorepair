import { getAllTenants } from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { format } from 'date-fns'

export const metadata = { title: 'Clients' }

export default async function AdminClientsPage() {
  const tenants = await getAllTenants()
  const active  = tenants.filter(t => t.status === "active" || t.status === "trial")

  return (
    <>
      <Topbar title="Clients" subtitle={`${active.length} active / ${tenants.length} total`} />
      <div className="dash-content">
        <div className="kpi-grid" style={{ marginBottom: "20px" }}>
          {["active","trial","past_due","suspended"].map(s => (
            <div key={s} className="kpi-card">
              <div className="kpi-label">{s.replace("_"," ")}</div>
              <div className="kpi-value">{tenants.filter(t => t.status === s).length}</div>
            </div>
          ))}
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Tenant</th><th>Plan</th><th>Status</th><th>Created</th></tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--text)" }}>{t.name}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{t.slug}</div>
                  </td>
                  <td><span className="badge badge-blue">{t.plan}</span></td>
                  <td><StatusBadge status={t.status} /></td>
                  <td style={{ fontSize: "12px", color: "var(--text-3)" }}>
                    {format(new Date(t.created_at), "MMM d, yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
