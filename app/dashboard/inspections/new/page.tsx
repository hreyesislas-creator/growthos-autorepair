import { assertCanEditDashboardModule } from '@/lib/auth/roles'
import { getDashboardTenant } from '@/lib/tenant'
import {
  getCustomers, getVehicles, getInspectionTemplates,
  getTeamUsers, getCurrentTenantUser,
} from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import InspectionForm from '../InspectionForm'

export const metadata = { title: 'New Inspection' }

export default async function NewInspectionPage() {
  await assertCanEditDashboardModule('inspections')
  const ctx      = await getDashboardTenant()
  const tenantId = ctx?.tenant.id ?? ''

  const [customers, vehicles, templates, teamUsers, currentUser] = await Promise.all([
    getCustomers(tenantId),
    getVehicles(tenantId),
    getInspectionTemplates(tenantId),
    getTeamUsers(tenantId),
    getCurrentTenantUser(tenantId),
  ])

  return (
    <>
      <Topbar title="New Inspection" />
      <InspectionForm
        customers={customers}
        vehicles={vehicles}
        templates={templates}
        teamUsers={teamUsers}
        currentTenantUserId={currentUser?.id ?? null}
      />
    </>
  )
}
