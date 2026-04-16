import type { ReactNode } from 'react'
import { assertCanAccessDashboardModule } from '@/lib/auth/roles'

/** Calls UI uses the same access policy as communications (admin-only in current matrix). */
export default async function CallsLayout({ children }: { children: ReactNode }) {
  await assertCanAccessDashboardModule('communications')
  return <>{children}</>
}
