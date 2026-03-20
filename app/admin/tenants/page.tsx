import { getAllTenants } from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { format } from 'date-fns'

export const metadata = { title: 'All Tenants' }

export default async function AdminTenantsPage() {
  const tenants = await getAllTenants()

  return (
    <>
      <Topbar title="Tenants" subtitle={`${tenants.length} total`} />
      <div className="dash-content">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Slug</th><th>Name</th><th>Plan</th><th>Status</th><th>Trial Ends</th><th>Created</th></tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-3)" }}>{t.slug}</td>
                  <td style={{ fontWeight: 600, color: "var(--text)" }}>{t.name}</td>
                  <td><span className="badge badge-blue">{t.plan}</span></td>
                  <td><StatusBadge status={t.status} /></td>
                  <td style={{ fontSize: "12px", color: "var(--text-3)" }}>
                    {t.trial_ends_at ? format(new Date(t.trial_ends_at), "MMM d, yyyy") : "—"}
                  </td>
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
