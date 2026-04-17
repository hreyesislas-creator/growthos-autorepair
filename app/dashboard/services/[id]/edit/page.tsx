import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import { getServiceCatalogById, getPartsByTenant } from '@/lib/queries'
import { assertCanEditDashboardModule } from '@/lib/auth/roles'
import Topbar from '@/components/dashboard/Topbar'
import ServiceCatalogForm from '../../ServiceCatalogForm'

export const metadata = { title: 'Edit Job Template' }

export default async function EditServiceCatalogPage({
  params,
}: {
  params: { id: string }
}) {
  await assertCanEditDashboardModule('estimates')
  const ctx = await getDashboardTenant()
  if (!ctx) return notFound()

  const [row, catalogParts] = await Promise.all([
    getServiceCatalogById(ctx.tenant.id, params.id),
    getPartsByTenant(ctx.tenant.id),
  ])
  if (!row || !row.is_active) return notFound()

  return (
    <>
      <Topbar
        title="Edit Job Template"
        action={{ label: '← Job Templates', href: '/dashboard/services' }}
      />
      <div className="dash-content">
        <ServiceCatalogForm initial={row} catalogParts={catalogParts} />
      </div>
    </>
  )
}
