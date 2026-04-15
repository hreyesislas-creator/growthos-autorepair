import type { ReactNode } from 'react'
import { assertDashboardRole } from '@/lib/dashboard-guard'
import { canViewReviews } from '@/lib/dashboard-permissions'

export default async function ReviewsLayout({ children }: { children: ReactNode }) {
  await assertDashboardRole(canViewReviews)
  return <>{children}</>
}
