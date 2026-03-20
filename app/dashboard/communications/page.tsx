import { getDashboardTenant } from '@/lib/tenant'
import { getMessageLogs, getMessageTemplates } from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { format } from 'date-fns'

export const metadata = { title: 'Communications' }

export default async function CommunicationsPage() {
  const ctx       = await getDashboardTenant()
  const tenantId  = ctx?.tenant.id ?? ''
  const [logs, templates] = await Promise.all([
    getMessageLogs(tenantId),
    getMessageTemplates(tenantId),
  ])

  return (
    <>
      <Topbar title="Communications" action={{ label: 'Send Message', href: '#' }} />
      <div className="dash-content">
        <div className="two-col">

          {/* Message log */}
          <div className="card">
            <div className="section-title" style={{ marginBottom: "14px" }}>Message Log</div>
            {logs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <div className="empty-state-title">No messages sent yet</div>
              </div>
            ) : (
              <div className="table-wrap" style={{ border: "none" }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Date</th><th>Channel</th><th>To</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {logs.map(m => (
                      <tr key={m.id}>
                        <td style={{ fontSize: "12px", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                          {format(new Date(m.created_at), "MMM d, h:mm a")}
                        </td>
                        <td>
                          <span className={`badge ${m.channel === "sms" ? "badge-blue" : "badge-purple"}`}>
                            {(m.channel ?? '').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontSize: "12px" }}>{m.to_address}</td>
                        <td><StatusBadge status={m.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Templates */}
          <div className="card">
            <div className="section-title" style={{ marginBottom: "14px" }}>Message Templates</div>
            {templates.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-title">No templates yet</div>
                <div className="empty-state-body">Create reusable SMS and email templates.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {templates.map(t => (
                  <div key={t.id} className="card-sm" style={{ cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text)" }}>{t.name}</div>
                      <span className={`badge ${t.channel === "sms" ? "badge-blue" : t.channel === "email" ? "badge-purple" : "badge-gray"}`}>
                        {t.channel}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "4px" }}>
                      {(t.body_en ?? '').slice(0, 80)}{(t.body_en ?? '').length > 80 ? "…" : ""}
                    </div>
                    {t.body_es && (
                      <div style={{ fontSize: "11px", color: "var(--blue-light)", marginTop: "3px" }}>ES available</div>
                    )}
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
