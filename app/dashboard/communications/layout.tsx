import type { ReactNode } from 'react'
import { assertCanAccessDashboardModule } from '@/lib/auth/roles'

export default async function CommunicationsLayout({ children }: { children: ReactNode }) {
  await assertCanAccessDashboardModule('communications')
  return <>{children}</>
}
