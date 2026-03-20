import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import { getCustomerById } from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import CustomerForm from '../../CustomerForm'

export const metadata = { title: 'Edit Customer' }

export default async function EditCustomerPage({
  params,
}: {
  params: { id: string }
}) {
  const ctx = await getDashboardTenant()
  if (!ctx) notFound()

  const customer = await getCustomerById(ctx.tenant.id, params.id)
  if (!customer) notFound()

  return (
    <>
      <Topbar
        title={`${customer.first_name} ${customer.last_name}`}
        subtitle="Edit Customer"
      />
      <div className="dash-content">
        <div className="card" style={{ maxWidth: 720 }}>
          <CustomerForm customer={customer} />
        </div>
      </div>
    </>
  )
}
