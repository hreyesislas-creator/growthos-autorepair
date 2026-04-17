import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import { getPartsByTenant } from '@/lib/queries'
import { assertCanEditDashboardModule } from '@/lib/auth/roles'
import Topbar from '@/components/dashboard/Topbar'
import ServiceCatalogForm from '../ServiceCatalogForm'

export const metadata = { title: 'New Job Template' }

export default async function NewServiceCatalogPage() {
  await assertCanEditDashboardModule('estimates')
  const ctx = await getDashboardTenant()
  if (!ctx) return notFound()

  const catalogParts = await getPartsByTenant(ctx.tenant.id)

  return (
    <>
      <Topbar
        title="New Job Template"
        action={{ label: '← Job Templates', href: '/dashboard/services' }}
      />
      <div className="dash-content">
        <ServiceCatalogForm initial={null} catalogParts={catalogParts} />
      </div>
    </>
  )
}
