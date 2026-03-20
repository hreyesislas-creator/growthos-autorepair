import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import { getVehicleById, getCustomers } from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import VehicleForm from '../../VehicleForm'

export const metadata = { title: 'Edit Vehicle' }

export default async function EditVehiclePage({
  params,
}: {
  params: { id: string }
}) {
  const ctx = await getDashboardTenant()
  if (!ctx) notFound()

  const [vehicle, customers] = await Promise.all([
    getVehicleById(ctx.tenant.id, params.id),
    getCustomers(ctx.tenant.id),
  ])

  if (!vehicle) notFound()

  const title = [vehicle.year, vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(' ') || 'Edit Vehicle'

  return (
    <>
      <Topbar title={title} subtitle="Edit Vehicle" />
      <div className="dash-content">
        <div className="card" style={{ maxWidth: 720 }}>
          <VehicleForm vehicle={vehicle} customers={customers} />
        </div>
      </div>
    </>
  )
}
