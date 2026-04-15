import type { ReactNode } from 'react'
import { assertDashboardRole } from '@/lib/dashboard-guard'
import { canViewCommunications } from '@/lib/dashboard-permissions'

export default async function CommunicationsLayout({ children }: { children: ReactNode }) {
  await assertDashboardRole(canViewCommunications)
  return <>{children}</>
}
