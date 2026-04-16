import type { ReactNode } from 'react'
import { assertCanAccessDashboardModule } from '@/lib/auth/roles'

export default async function TeamLayout({ children }: { children: ReactNode }) {
  await assertCanAccessDashboardModule('team')
  return <>{children}</>
}
