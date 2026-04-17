import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import { assertCanEditDashboardModule } from '@/lib/auth/roles'
import Topbar from '@/components/dashboard/Topbar'
import PartsCatalogForm from '../PartsCatalogForm'

export const metadata = { title: 'Add Part' }

export default async function NewPartPage() {
  await assertCanEditDashboardModule('parts')
  const ctx = await getDashboardTenant()
  if (!ctx) return notFound()

  return (
    <>
      <Topbar
        title="Add catalog part"
        action={{ label: '← Parts Catalog', href: '/dashboard/parts' }}
      />
      <div className="dash-content">
        <PartsCatalogForm initial={null} />
      </div>
    </>
  )
}
