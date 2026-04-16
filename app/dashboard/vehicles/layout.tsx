import type { ReactNode } from 'react'
import { assertCanAccessDashboardModule } from '@/lib/auth/roles'

export default async function VehiclesLayout({ children }: { children: ReactNode }) {
  await assertCanAccessDashboardModule('vehicles')
  return <>{children}</>
}
