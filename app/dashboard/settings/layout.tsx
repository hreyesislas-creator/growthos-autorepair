import type { ReactNode } from 'react'
import { assertCanAccessDashboardModule } from '@/lib/auth/roles'

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  await assertCanAccessDashboardModule('settings')
  return <>{children}</>
}
