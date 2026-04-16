/**
 * Shared sorting / filtering for inspection & work order list views (Phase 6.5).
 * Does not enforce security — assignment checks remain on detail + server actions.
 */

import { isAdmin, type AppRole } from '@/lib/auth/role-access'
import type { TenantUser } from '@/lib/types'

export type AssignmentListScope = 'mine' | 'unassigned' | 'all'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * `tech` query param: advisor/admin may filter lists to one tenant_users.id.
 * Technicians never get a parsed id (param ignored) so their UX stays scope-only.
 */
export function parseAdvisorTechnicianFilterParam(
  raw: string | string[] | undefined,
  role: AppRole,
): string | null {
  if (role === 'technician' || role === 'viewer') return null
  if (!isAdmin(role) && role !== 'service_advisor') return null

  const v = Array.isArray(raw) ? raw[0] : raw
  if (v == null || typeof v !== 'string') return null
  const t = v.trim()
  if (!UUID_RE.test(t)) return null
  return t
}

export function parseAssignmentListScope(raw: string | string[] | undefined): AssignmentListScope {
  const v = Array.isArray(raw) ? raw[0] : raw
  if (v === 'mine' || v === 'unassigned') return v
  return 'all'
}

export function filterByAssignmentScope<T extends { technician_id: string | null }>(
  rows: T[],
  scope: AssignmentListScope,
  currentTenantUserId: string,
): T[] {
  if (scope === 'mine') {
    return rows.filter(r => r.technician_id === currentTenantUserId)
  }
  if (scope === 'unassigned') {
    return rows.filter(r => r.technician_id == null)
  }
  return rows
}

/** Technicians: mine → unassigned → other; then newest first. Others: newest first only. */
export function sortForTechnicianListPriority<T extends { technician_id: string | null; created_at: string }>(
  rows: T[],
  role: AppRole,
  currentTenantUserId: string,
): T[] {
  if (role !== 'technician') {
    return [...rows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
  }
  const rank = (r: T) => {
    if (r.technician_id === currentTenantUserId) return 0
    if (r.technician_id == null) return 1
    return 2
  }
  return [...rows].sort((a, b) => {
    const d = rank(a) - rank(b)
    if (d !== 0) return d
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export type AssignmentLabel = 'you' | 'unassigned' | 'other'

export function assignmentLabelForRow(
  technicianId: string | null,
  currentTenantUserId: string,
): AssignmentLabel {
  if (technicianId == null) return 'unassigned'
  if (technicianId === currentTenantUserId) return 'you'
  return 'other'
}

/** Badge label + style kind; resolves other assignees to display names when provided. */
export function assigneeBadgeDisplay(
  technicianId: string | null,
  currentTenantUserId: string,
  nameById: Record<string, string>,
): { kind: 'you' | 'unassigned' | 'other_named'; text: string } {
  if (technicianId == null) return { kind: 'unassigned', text: 'Unassigned' }
  if (technicianId === currentTenantUserId) return { kind: 'you', text: 'You' }
  const name = nameById[technicianId]?.trim()
  return { kind: 'other_named', text: name || 'Team member' }
}

export function applyAssignmentListFilters<T extends { technician_id: string | null }>(
  rows: T[],
  assignmentScope: AssignmentListScope,
  advisorTechnicianId: string | null,
  currentTenantUserId: string,
  role: AppRole,
): T[] {
  if (advisorTechnicianId && role !== 'technician' && role !== 'viewer') {
    return rows.filter(r => r.technician_id === advisorTechnicianId)
  }
  return filterByAssignmentScope(rows, assignmentScope, currentTenantUserId)
}

/** Display names for assignee badges (all team rows; includes inactive for historical assignments). */
export function technicianNameMapFromTeamUsers(users: TenantUser[]): Record<string, string> {
  const m: Record<string, string> = {}
  for (const u of users) {
    m[u.id] = u.full_name?.trim() || u.email || 'Team member'
  }
  return m
}

export interface AdvisorTechnicianFilterOption {
  id:    string
  label: string
}

/** Active members who may appear as assignees or self-filter targets for advisors/admins. */
export function advisorTechnicianFilterOptionsFromTeamUsers(
  users: TenantUser[],
): AdvisorTechnicianFilterOption[] {
  return users
    .filter(u => {
      if (!u.is_active) return false
      const r = u.role
      return (
        r === 'technician' ||
        r === 'staff' ||
        r === 'admin' ||
        r === 'owner' ||
        r === 'manager' ||
        r === 'service_advisor' ||
        r === 'advisor'
      )
    })
    .map(u => ({ id: u.id, label: u.full_name?.trim() || u.email }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
}

/** After UUID parse: keep only ids that exist on the tenant roster. */
export function validatedAdvisorTechnicianId(
  parsed: string | null,
  teamUsers: TenantUser[],
): string | null {
  if (!parsed) return null
  return teamUsers.some(u => u.id === parsed) ? parsed : null
}

export function canUseAdvisorTechnicianFilter(role: AppRole): boolean {
  return isAdmin(role) || role === 'service_advisor'
}
