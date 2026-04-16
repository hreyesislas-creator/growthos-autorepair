import type { ReactNode } from 'react'
import { assertCanAccessDashboardModule } from '@/lib/auth/roles'

export default async function WorkOrdersLayout({ children }: { children: ReactNode }) {
  await assertCanAccessDashboardModule('work_orders')
  return <>{children}</>
}
