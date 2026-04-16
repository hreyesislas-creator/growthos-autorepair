import type { ReactNode } from 'react'
import { assertCanAccessDashboardModule } from '@/lib/auth/roles'

export default async function InspectionsLayout({ children }: { children: ReactNode }) {
  await assertCanAccessDashboardModule('inspections')
  return <>{children}</>
}
