import type { ReactNode } from 'react'
import { assertDashboardRole } from '@/lib/dashboard-guard'
import { canViewWebsite } from '@/lib/dashboard-permissions'

export default async function WebsiteLayout({ children }: { children: ReactNode }) {
  await assertDashboardRole(canViewWebsite)
  return <>{children}</>
}
