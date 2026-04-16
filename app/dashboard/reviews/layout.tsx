import type { ReactNode } from 'react'
import { assertCanAccessDashboardModule } from '@/lib/auth/roles'

export default async function ReviewsLayout({ children }: { children: ReactNode }) {
  await assertCanAccessDashboardModule('reviews')
  return <>{children}</>
}
