import { cache } from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { normalizeDashboardRole, type DashboardRole } from '@/lib/dashboard-permissions'

/**
 * Active tenant member role for the logged-in user (from `tenant_users.role`).
 * Cached per request so layouts + sidebar do not repeat the query.
 * Uses admin client + auth_user_id, consistent with getDashboardTenant().
 */
export const getCurrentUserRoleForTenant = cache(async function getCurrentUserRoleForTenant(): Promise<DashboardRole> {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return normalizeDashboardRole(null)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tenant_users')
    .select('role')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('[getCurrentUserRoleForTenant]', error.message)
    return normalizeDashboardRole(null)
  }

  return normalizeDashboardRole(data?.role as string | null | undefined)
})
