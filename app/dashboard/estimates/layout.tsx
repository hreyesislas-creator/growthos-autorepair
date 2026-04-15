import type { ReactNode } from 'react'
import { assertDashboardRole } from '@/lib/dashboard-guard'
import { canViewEstimates } from '@/lib/dashboard-permissions'

export default async function EstimatesLayout({ children }: { children: ReactNode }) {
  await assertDashboardRole(canViewEstimates)
  return <>{children}</>
}
