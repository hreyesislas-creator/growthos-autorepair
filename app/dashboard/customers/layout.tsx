import type { ReactNode } from 'react'
import { assertCanAccessDashboardModule } from '@/lib/auth/roles'

export default async function CustomersLayout({ children }: { children: ReactNode }) {
  await assertCanAccessDashboardModule('customers')
  return <>{children}</>
}
