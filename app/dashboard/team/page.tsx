import { getDashboardTenant } from '@/lib/tenant'
import { getTeamUsers } from '@/lib/queries'
import { canEditDashboardModule } from '@/lib/auth/roles'
import Topbar from '@/components/dashboard/Topbar'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { DeactivateTeamMemberButton } from './DeactivateTeamMemberButton'

export const metadata = { title: 'Team & Roles' }

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', admin: 'Admin', advisor: 'Service Advisor',
  technician: 'Technician', viewer: 'Viewer',
}

/** Combined membership enablement + invite onboarding (legacy: invite_status null = Active). */
function teamMemberStatusKey(u: { is_active: boolean; invite_status?: string | null }) {
  if (!u.is_active) return 'inactive' as const
  if (u.invite_status === 'pending') return 'invited' as const
  return 'active' as const
}

export default async function TeamPage() {
  const ctx      = await getDashboardTenant()
  const tenantId = ctx?.tenant.id ?? ''
  const users    = await getTeamUsers(tenantId)
  const canEdit  = await canEditDashboardModule('team')

  return (
    <>
      <Topbar
        title="Team & Roles"
        action={canEdit ? { label: 'Invite User', href: '/dashboard/team/invite' } : undefined}
      />
      <div className="dash-content">
        <div className="table-wrap">
          {users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔑</div>
              <div className="empty-state-title">No team members yet</div>
              <div className="empty-state-body">Invite your team to collaborate on the dashboard.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Language</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const displayName  = u.full_name?.trim() || u.email?.trim() || 'Unnamed User'
                  const avatarLetter = displayName.charAt(0).toUpperCase()
                  const statusKey    = teamMemberStatusKey(u)
                  return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div className="avatar">{avatarLetter}</div>
                        <span style={{ fontWeight: 600, color: "var(--text)" }}>{displayName}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: "12px" }}>{u.email}</td>
                    <td><span className="badge badge-blue">{ROLE_LABELS[u.role] ?? u.role ?? '—'}</span></td>
                    <td><span className="badge badge-gray">{u.language_pref === "es" ? "ES" : "EN"}</span></td>
                    <td>
                      <StatusBadge
                        status={statusKey}
                        label={statusKey === 'invited' ? 'Invited' : statusKey === 'inactive' ? 'Inactive' : 'Active'}
                      />
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <DeactivateTeamMemberButton
                        tenantUserId={u.id}
                        role={u.role}
                        isActive={u.is_active}
                        canManage={canEdit}
                      />
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
