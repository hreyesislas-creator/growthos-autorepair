import { getDashboardTenant } from '@/lib/tenant'
import { getInspections, getInspectionTemplates } from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { format } from 'date-fns'

export const metadata = { title: 'Inspections' }

export default async function InspectionsPage() {
  const ctx        = await getDashboardTenant()
  const tenantId   = ctx?.tenant.id ?? ''
  const [inspections, templates] = await Promise.all([
    getInspections(tenantId),
    getInspectionTemplates(tenantId),
  ])

  return (
    <>
      <Topbar title="Inspections" action={{ label: 'New Inspection', href: '/dashboard/inspections/new' }} />
      <div className="dash-content">

        {templates.length > 0 && (
          <div style={{ marginBottom: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", color: "var(--text-3)", alignSelf: "center" }}>Templates:</span>
            {templates.map(t => (
              <span key={t.id} className="badge badge-blue">{t.name}</span>
            ))}
          </div>
        )}

        <div className="table-wrap">
          {inspections.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-title">No inspections yet</div>
              <div className="empty-state-body">Create your first digital vehicle inspection.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Template</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map(i => (
                  <tr key={i.id}>
                    <td style={{ fontSize: "12px", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                      {format(new Date(i.created_at), "MMM d, yyyy")}
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--text)" }}>{i.vehicle_id ?? "—"}</td>
                    <td><StatusBadge status={i.status} /></td>
                    <td style={{ fontSize: "12px" }}>{i.template_id ? "Custom template" : "No template"}</td>
                    <td style={{ fontSize: "12px", color: "var(--text-3)" }}>
                      {i.completed_at ? format(new Date(i.completed_at), "MMM d") : "—"}
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
