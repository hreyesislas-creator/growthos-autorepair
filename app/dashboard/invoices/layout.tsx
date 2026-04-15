import type { ReactNode } from 'react'
import { assertDashboardRole } from '@/lib/dashboard-guard'
import { canViewInvoices } from '@/lib/dashboard-permissions'

export default async function InvoicesLayout({ children }: { children: ReactNode }) {
  await assertDashboardRole(canViewInvoices)
  return <>{children}</>
}
