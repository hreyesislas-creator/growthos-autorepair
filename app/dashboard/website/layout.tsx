import type { ReactNode } from 'react'
import { assertCanAccessDashboardModule } from '@/lib/auth/roles'

export default async function WebsiteLayout({ children }: { children: ReactNode }) {
  await assertCanAccessDashboardModule('website')
  return <>{children}</>
}
