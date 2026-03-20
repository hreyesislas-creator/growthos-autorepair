import { getSupportTickets, getAllTenants } from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { format } from 'date-fns'

export const metadata = { title: 'Support' }

export default async function AdminSupportPage() {
  const [tickets, tenants] = await Promise.all([getSupportTickets(), getAllTenants()])

  return (
    <>
      <Topbar title="Support Tickets" subtitle={`${tickets.filter(t => t.status === "open").length} open`} />
      <div className="dash-content">
        <div className="table-wrap">
          {tickets.length === 0 ? (
            <div className="empty-state" style={{ padding: "48px" }}>
              <div className="empty-state-icon">🎫</div>
              <div className="empty-state-title">No support tickets</div>
              <div className="empty-state-body">All clear — no open issues.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Subject</th><th>Tenant</th><th>Priority</th><th>Status</th><th>Created</th></tr>
              </thead>
              <tbody>
                {tickets.map(t => {
                  const tenant = tenants.find(tn => tn.id === t.tenant_id)
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600, color: "var(--text)", maxWidth: "280px" }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.subject}
                        </div>
                      </td>
                      <td style={{ fontSize: "12px" }}>{tenant?.name ?? "—"}</td>
                      <td>
                        <span className={`badge ${t.priority === "high" ? "badge-red" : t.priority === "medium" ? "badge-yellow" : "badge-gray"}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td><StatusBadge status={t.status} /></td>
                      <td style={{ fontSize: "12px", color: "var(--text-3)" }}>
                        {format(new Date(t.created_at), "MMM d, yyyy")}
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
