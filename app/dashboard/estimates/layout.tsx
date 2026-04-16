import type { ReactNode } from 'react'
import { assertCanAccessDashboardModule } from '@/lib/auth/roles'

export default async function EstimatesLayout({ children }: { children: ReactNode }) {
  await assertCanAccessDashboardModule('estimates')
  return <>{children}</>
}
