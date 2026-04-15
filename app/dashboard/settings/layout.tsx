import type { ReactNode } from 'react'
import { assertDashboardRole } from '@/lib/dashboard-guard'
import { canViewSettings } from '@/lib/dashboard-permissions'

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  await assertDashboardRole(canViewSettings)
  return <>{children}</>
}
