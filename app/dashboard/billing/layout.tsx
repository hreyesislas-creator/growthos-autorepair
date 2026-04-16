import type { ReactNode } from 'react'
import { assertCanAccessDashboardModule } from '@/lib/auth/roles'

export default async function BillingLayout({ children }: { children: ReactNode }) {
  await assertCanAccessDashboardModule('billing')
  return <>{children}</>
}
