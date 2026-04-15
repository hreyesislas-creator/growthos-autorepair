import type { ReactNode } from 'react'
import { assertDashboardRole } from '@/lib/dashboard-guard'
import { canViewFinancials } from '@/lib/dashboard-permissions'

export default async function FinancialsLayout({ children }: { children: ReactNode }) {
  await assertDashboardRole(canViewFinancials)
  return <>{children}</>
}
