import type { ReactNode } from 'react'
import { assertDashboardRole } from '@/lib/dashboard-guard'
import { canViewBilling } from '@/lib/dashboard-permissions'

export default async function BillingLayout({ children }: { children: ReactNode }) {
  await assertDashboardRole(canViewBilling)
  return <>{children}</>
}
