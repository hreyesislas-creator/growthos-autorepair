import type { ReactNode } from 'react'
import { assertCanAccessDashboardModule } from '@/lib/auth/roles'

export default async function InvoicesLayout({ children }: { children: ReactNode }) {
  await assertCanAccessDashboardModule('invoices')
  return <>{children}</>
}
