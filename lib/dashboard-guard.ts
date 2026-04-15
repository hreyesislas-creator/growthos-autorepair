import { redirect } from 'next/navigation'
import type { DashboardRole } from '@/lib/dashboard-permissions'
import { getCurrentUserRoleForTenant } from '@/lib/dashboard-role'

/** UI-only gate: redirect to overview if the role fails the check. */
export async function assertDashboardRole(allowed: (role: DashboardRole) => boolean): Promise<void> {
  const role = await getCurrentUserRoleForTenant()
  if (!allowed(role)) redirect('/dashboard')
}
