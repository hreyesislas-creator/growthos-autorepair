import { getDashboardTenant } from '@/lib/tenant'
import { getCustomers, getVehicles, getInspectionTemplates } from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import InspectionForm from '../InspectionForm'

export const metadata = { title: 'New Inspection' }

export default async function NewInspectionPage() {
  const ctx      = await getDashboardTenant()
  const tenantId = ctx?.tenant.id ?? ''

  const [customers, vehicles, templates] = await Promise.all([
    getCustomers(tenantId),
    getVehicles(tenantId),
    getInspectionTemplates(tenantId),
  ])

  return (
    <>
      <Topbar title="New Inspection" />
      <InspectionForm
        customers={customers}
        vehicles={vehicles}
        templates={templates}
      />
    </>
  )
}
