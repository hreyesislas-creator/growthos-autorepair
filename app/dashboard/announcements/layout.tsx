import type { ReactNode } from 'react'
import { assertCanManageShopAnnouncements } from '@/lib/auth/roles'

export default async function ShopAnnouncementsLayout({ children }: { children: ReactNode }) {
  await assertCanManageShopAnnouncements()
  return <>{children}</>
}
