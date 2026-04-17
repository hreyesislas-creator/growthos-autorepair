import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import { getPartById } from '@/lib/queries'
import { assertCanEditDashboardModule } from '@/lib/auth/roles'
import Topbar from '@/components/dashboard/Topbar'
import PartsCatalogForm from '../../PartsCatalogForm'

export const metadata = { title: 'Edit Part' }

export default async function EditPartPage({
  params,
}: {
  params: { id: string }
}) {
  await assertCanEditDashboardModule('parts')
  const ctx = await getDashboardTenant()
  if (!ctx) return notFound()

  const row = await getPartById(ctx.tenant.id, params.id)
  if (!row || !row.is_active) return notFound()

  return (
    <>
      <Topbar
        title="Edit catalog part"
        action={{ label: '← Parts Catalog', href: '/dashboard/parts' }}
      />
      <div className="dash-content">
        <PartsCatalogForm initial={row} />
      </div>
    </>
  )
}
