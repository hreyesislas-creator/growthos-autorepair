/**
 * Client- and server-safe role normalization and module matrix (no Supabase / next/headers).
 * Imported by Sidebar and by `lib/auth/roles.ts` resolvers.
 */

// ── Types ─────────────────────────────────────────────────────────────

/** Canonical roles stored in `tenant_users.role` (plus legacy values normalized in). */
export type AppRole = 'admin' | 'service_advisor' | 'technician' | 'viewer'

/**
 * Coarse product modules for RBAC. Maps to route prefixes / nav in later phases.
 */
export type AppModule =
  | 'dashboard'
  | 'customers'
  | 'vehicles'
  | 'appointments'
  | 'inspections'
  | 'estimates'
  | 'parts'
  | 'work_orders'
  | 'invoices'
  | 'communications'
  | 'financials'
  | 'website'
  | 'reviews'
  | 'billing'
  | 'team'
  | 'settings'

export type ModuleAccessLevel = 'none' | 'read' | 'edit'

// ── Normalization (DB / legacy → AppRole) ───────────────────────────

/**
 * Maps raw `tenant_users.role` (and legacy invite/dashboard values) to AppRole.
 * Empty/null/unknown → `viewer` (restrictive, production-safe).
 */
export function normalizeAppRole(raw: string | null | undefined): AppRole {
  if (raw == null || String(raw).trim() === '') return 'viewer'
  const r = String(raw).trim().toLowerCase().replace(/-/g, '_')

  if (r === 'admin') return 'admin'
  if (r === 'owner') return 'admin'
  if (r === 'manager') return 'admin'
  if (r === 'service_advisor' || r === 'advisor') return 'service_advisor'
  if (r === 'technician') return 'technician'
  if (r === 'viewer') return 'viewer'
  if (r === 'staff') return 'technician'
  return 'viewer'
}

export function isAdmin(role: AppRole): boolean {
  return role === 'admin'
}

// ── Permission matrix ───────────────────────────────────────────────

const ALL_MODULES: AppModule[] = [
  'dashboard',
  'customers',
  'vehicles',
  'appointments',
  'inspections',
  'estimates',
  'parts',
  'work_orders',
  'invoices',
  'communications',
  'financials',
  'website',
  'reviews',
  'billing',
  'team',
  'settings',
]

function fullEdit(): Record<AppModule, ModuleAccessLevel> {
  return Object.fromEntries(ALL_MODULES.map(m => [m, 'edit' as const])) as Record<
    AppModule,
    ModuleAccessLevel
  >
}

function row(partial: Partial<Record<AppModule, ModuleAccessLevel>>): Record<
  AppModule,
  ModuleAccessLevel
> {
  const base = Object.fromEntries(ALL_MODULES.map(m => [m, 'none' as const])) as Record<
    AppModule,
    ModuleAccessLevel
  >
  for (const k of Object.keys(partial) as AppModule[]) {
    base[k] = partial[k]!
  }
  return base
}

/** Effective access per role × module. */
const ROLE_MODULE_ACCESS: Record<AppRole, Record<AppModule, ModuleAccessLevel>> = {
  admin: fullEdit(),

  service_advisor: row({
    dashboard: 'edit',
    customers: 'edit',
    vehicles: 'edit',
    appointments: 'edit',
    inspections: 'edit',
    estimates: 'edit',
    parts: 'edit',
    work_orders: 'edit',
    invoices: 'edit',
    communications: 'none',
    financials: 'none',
    website: 'none',
    reviews: 'none',
    billing: 'none',
    team: 'none',
    settings: 'none',
  }),

  technician: row({
    dashboard: 'read',
    appointments: 'read',
    inspections: 'edit',
    work_orders: 'edit',
  }),

  viewer: row({
    dashboard: 'read',
    customers: 'read',
    vehicles: 'read',
    appointments: 'read',
    inspections: 'read',
    estimates: 'read',
    work_orders: 'read',
    invoices: 'read',
    communications: 'none',
  }),
}

/** Dashboard sidebar `Link` hrefs → {@link AppModule} for nav visibility. */
const DASHBOARD_NAV_HREF_TO_MODULE: Record<string, AppModule> = {
  '/dashboard': 'dashboard',
  '/dashboard/appointments': 'appointments',
  '/dashboard/customers': 'customers',
  '/dashboard/vehicles': 'vehicles',
  '/dashboard/inspections': 'inspections',
  '/dashboard/estimates': 'estimates',
  '/dashboard/services': 'estimates',
  '/dashboard/parts': 'parts',
  '/dashboard/work-orders': 'work_orders',
  '/dashboard/invoices': 'invoices',
  '/dashboard/communications': 'communications',
  '/dashboard/website': 'website',
  '/dashboard/reviews': 'reviews',
  '/dashboard/financials': 'financials',
  '/dashboard/billing': 'billing',
  '/dashboard/team': 'team',
  '/dashboard/settings': 'settings',
}

export function appModuleForDashboardNavHref(href: string): AppModule | null {
  return DASHBOARD_NAV_HREF_TO_MODULE[href] ?? null
}

export function getModuleAccessLevel(role: AppRole, module: AppModule): ModuleAccessLevel {
  return ROLE_MODULE_ACCESS[role]?.[module] ?? 'none'
}

export function canAccessModule(role: AppRole, module: AppModule): boolean {
  return getModuleAccessLevel(role, module) !== 'none'
}

export function canEditModule(role: AppRole, module: AppModule): boolean {
  return getModuleAccessLevel(role, module) === 'edit'
}

export function canReadModule(role: AppRole, module: AppModule): boolean {
  const a = getModuleAccessLevel(role, module)
  return a === 'read' || a === 'edit'
}
