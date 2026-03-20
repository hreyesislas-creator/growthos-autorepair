import { getAllTenants } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/dashboard/Topbar'
import StatusBadge from '@/components/dashboard/StatusBadge'

export const metadata = { title: 'Admin Billing' }

export default async function AdminBillingPage() {
  const supabase = await createClient()
  const tenants  = await getAllTenants()
  const { data: snapshots } = await supabase
    .from("tenant_billing_snapshots")
    .select("*")
    .order("updated_at", { ascending: false })

  const mrr = (snapshots ?? []).reduce((sum, s) => sum + (s.monthly_amount ?? 0), 0)

  return (
    <>
      <Topbar title="Admin Billing" />
      <div className="dash-content">
        <div className="kpi-grid" style={{ marginBottom: "20px" }}>
          <div className="kpi-card">
            <div className="kpi-label">Total Tenants</div>
            <div className="kpi-value">{tenants.length}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">MRR</div>
            <div className="kpi-value">${mrr.toFixed(0)}</div>
            <div className="kpi-sub">monthly recurring</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Active Subscriptions</div>
            <div className="kpi-value">
              {(snapshots ?? []).filter(s => s.status === "active").length}
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Past Due</div>
            <div className="kpi-value" style={{ color: "var(--red)" }}>
              {(snapshots ?? []).filter(s => s.status === "past_due").length}
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Tenant</th><th>Plan</th><th>Status</th><th>Monthly</th><th>Next Billing</th></tr>
            </thead>
            <tbody>
              {(snapshots ?? []).map(s => {
                const tenant = tenants.find(t => t.id === s.tenant_id)
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, color: "var(--text)" }}>
                      {tenant?.name ?? s.tenant_id.slice(0, 8)}
                    </td>
                    <td><span className="badge badge-blue">{s.plan}</span></td>
                    <td><StatusBadge status={s.status} /></td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                      {s.monthly_amount ? `$${s.monthly_amount.toFixed(2)}` : "—"}
                    </td>
                    <td style={{ fontSize: "12px", color: "var(--text-3)" }}>
                      {s.next_billing_date ? new Date(s.next_billing_date).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
