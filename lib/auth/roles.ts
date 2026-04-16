/**
 * Application roles: re-exports client-safe matrix from `./role-access` plus server resolvers.
 */

export * from './role-access'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  normalizeAppRole,
  canAccessModule,
  canEditModule,
  type AppRole,
  type AppModule,
} from './role-access'

/**
 * Reads `tenant_users.role` for the logged-in user (active membership), same pattern as
 * `getCurrentUserRoleForTenant` / `getDashboardTenant`: session user + admin client + `auth_user_id`.
 * Returns normalized {@link AppRole}.
 */
export const getCurrentAppRoleForTenant = cache(async function getCurrentAppRoleForTenant(): Promise<AppRole> {
  const sessionClient = await createClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()
  // Callers with no session should gate on auth first; restrictive default if misused.
  if (!user) return 'viewer'

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tenant_users')
    .select('role')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('[getCurrentAppRoleForTenant]', error.message)
    return normalizeAppRole(null)
  }

  return normalizeAppRole(data?.role as string | null | undefined)
})

/**
 * Same as {@link getCurrentAppRoleForTenant} but when you already have `tenantId` and `authUserId`
 * (e.g. background jobs). Does not require a browser session.
 */
export async function getAppRoleForUserInTenant(
  tenantId: string,
  authUserId: string,
): Promise<AppRole | null> {
  if (!tenantId?.trim() || !authUserId?.trim()) return null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tenant_users')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('auth_user_id', authUserId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('[getAppRoleForUserInTenant]', error.message)
    return null
  }
  if (!data?.role) return null
  return normalizeAppRole(data.role as string)
}

/** Server layout guard: redirect to overview if the role cannot access the module. */
export async function assertCanAccessDashboardModule(module: AppModule): Promise<void> {
  const role = await getCurrentAppRoleForTenant()
  if (!canAccessModule(role, module)) redirect('/dashboard')
}

/** Server action helper: returns `{ error }` if the role cannot edit the module. */
export async function denyUnlessCanEditDashboardModule(
  module: AppModule,
): Promise<{ error: string } | null> {
  const role = await getCurrentAppRoleForTenant()
  if (!canEditModule(role, module)) return { error: 'Not authorized' }
  return null
}

/** Same as {@link denyUnlessCanEditDashboardModule} but requires edit on every listed module. */
export async function denyUnlessCanEditAllDashboardModules(
  modules: AppModule[],
): Promise<{ error: string } | null> {
  const role = await getCurrentAppRoleForTenant()
  for (const m of modules) {
    if (!canEditModule(role, m)) return { error: 'Not authorized' }
  }
  return null
}

/** Server layout / full-page guard: redirect if the role cannot edit the module. */
export async function assertCanEditDashboardModule(module: AppModule): Promise<void> {
  const denied = await denyUnlessCanEditDashboardModule(module)
  if (denied) redirect('/dashboard')
}

/** Server pages / RSC: whether the current user may edit the module (UI gating). */
export async function canEditDashboardModule(module: AppModule): Promise<boolean> {
  const role = await getCurrentAppRoleForTenant()
  return canEditModule(role, module)
}
