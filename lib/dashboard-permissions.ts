/**
 * Dashboard UI permissions V1 (owner / manager / staff).
 * Server- and client-safe pure helpers — no I/O.
 */

export type DashboardRole = 'owner' | 'manager' | 'staff'

/**
 * Maps DB `tenant_users.role` to V1 roles. Empty/null → owner (preserve legacy access).
 * Legacy team roles map into V1 so existing rows keep sensible UI access.
 */
export function normalizeDashboardRole(raw: string | null | undefined): DashboardRole {
  if (raw == null || String(raw).trim() === '') return 'owner'
  const r = String(raw).trim().toLowerCase()
  if (r === 'owner' || r === 'manager' || r === 'staff') return r
  if (r === 'admin' || r === 'advisor') return 'manager'
  if (r === 'technician' || r === 'viewer') return 'staff'
  return 'owner'
}

export function canViewFinancials(role: DashboardRole): boolean {
  return role === 'owner'
}

export function canViewBilling(role: DashboardRole): boolean {
  return role === 'owner'
}

export function canViewTeam(role: DashboardRole): boolean {
  return role === 'owner' || role === 'manager'
}

export function canViewSettings(role: DashboardRole): boolean {
  return role === 'owner' || role === 'manager'
}

export function canViewWebsite(role: DashboardRole): boolean {
  return role === 'owner' || role === 'manager'
}

export function canViewReviews(role: DashboardRole): boolean {
  return role === 'owner' || role === 'manager'
}

export function canViewEstimates(role: DashboardRole): boolean {
  return role === 'owner' || role === 'manager'
}

export function canViewInvoices(role: DashboardRole): boolean {
  return role === 'owner' || role === 'manager'
}

export function canViewCommunications(role: DashboardRole): boolean {
  return role === 'owner' || role === 'manager'
}

/** Operations nav (excluding Manage section). */
export function canViewOperationsNavHref(role: DashboardRole, href: string): boolean {
  switch (href) {
    case '/dashboard':
    case '/dashboard/appointments':
    case '/dashboard/customers':
    case '/dashboard/vehicles':
    case '/dashboard/inspections':
    case '/dashboard/work-orders':
      return true
    case '/dashboard/estimates':
      return canViewEstimates(role)
    case '/dashboard/invoices':
      return canViewInvoices(role)
    case '/dashboard/communications':
      return canViewCommunications(role)
    default:
      return true
  }
}

export function canViewManageNavHref(role: DashboardRole, href: string): boolean {
  switch (href) {
    case '/dashboard/website':
      return canViewWebsite(role)
    case '/dashboard/reviews':
      return canViewReviews(role)
    case '/dashboard/financials':
      return canViewFinancials(role)
    case '/dashboard/billing':
      return canViewBilling(role)
    case '/dashboard/team':
      return canViewTeam(role)
    case '/dashboard/settings':
      return canViewSettings(role)
    default:
      return true
  }
}
