import type { ReactNode } from 'react'
import { assertDashboardRole } from '@/lib/dashboard-guard'
import { canViewTeam } from '@/lib/dashboard-permissions'

export default async function TeamLayout({ children }: { children: ReactNode }) {
  await assertDashboardRole(canViewTeam)
  return <>{children}</>
}
