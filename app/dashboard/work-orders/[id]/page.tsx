import { notFound }           from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import {
  getWorkOrderById,
  getTeamUsers,
  getTenantUserById,
  getInspectionsForWorkOrder,
} from '@/lib/queries'
import { createClient }       from '@/lib/supabase/server'
import {
  canEditDashboardModule,
  getCurrentAppRoleForTenant,
  isAdmin,
} from '@/lib/auth/roles'
import {
  getCurrentDashboardTenantUser,
  technicianMayMutateAssignedRecord,
} from '@/lib/auth/operational-assignment'
import Topbar                 from '@/components/dashboard/Topbar'
import WorkOrderDetail        from './WorkOrderDetail'

export const metadata = { title: 'Work Order' }

export default async function WorkOrderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const ctx = await getDashboardTenant()
  if (!ctx) return notFound()

  const tenantId = ctx.tenant.id

  const [role, dashboardDu] = await Promise.all([
    getCurrentAppRoleForTenant(),
    getCurrentDashboardTenantUser(),
  ])

  if (role === 'technician' && !dashboardDu?.tenantUserId) return notFound()

  const woTechnicianScope =
    role === 'technician' && dashboardDu?.tenantUserId
      ? { technicianIdEq: dashboardDu.tenantUserId }
      : undefined

  // ── Load work order with items (technicians: query enforces technician_id match) ──
  const workOrder = await getWorkOrderById(tenantId, params.id, woTechnicianScope)
  if (!workOrder) return notFound()

  // ── Resolve customer and vehicle display labels ────────────────────────────
  const supabase = await createClient()

  const [customerRes, vehicleRes] = await Promise.all([
    workOrder.customer_id
      ? supabase
          .from('customers')
          .select('first_name, last_name')
          .eq('tenant_id', tenantId)
          .eq('id', workOrder.customer_id)
          .single()
      : Promise.resolve({ data: null }),
    workOrder.vehicle_id
      ? supabase
          .from('vehicles')
          .select('year, make, model')
          .eq('tenant_id', tenantId)
          .eq('id', workOrder.vehicle_id)
          .single()
      : Promise.resolve({ data: null }),
  ])

  const customer = customerRes.data as { first_name: string; last_name: string } | null
  const vehicle  = vehicleRes.data  as { year: number | null; make: string | null; model: string | null } | null

  const customerName = customer
    ? `${customer.first_name} ${customer.last_name}`.trim()
    : null

  const vehicleLabel = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')
    : null

  const subtitle = [customerName, vehicleLabel].filter(Boolean).join(' · ') || undefined

  const linkedInspOpts =
    role === 'technician' && dashboardDu?.tenantUserId
      ? { technicianIdEq: dashboardDu.tenantUserId }
      : undefined

  const [canEditWoModule, canEditInvoices, canEditInspections, teamUsers, linkedInspections] =
    await Promise.all([
    canEditDashboardModule('work_orders'),
    canEditDashboardModule('invoices'),
    canEditDashboardModule('inspections'),
    getTeamUsers(tenantId),
    getInspectionsForWorkOrder(tenantId, params.id, linkedInspOpts),
  ])

  const assignableTeamUsers = teamUsers.filter(u => {
    if (!u.is_active) return false
    const r = u.role
    return r === 'technician' || r === 'staff' || r === 'admin' || r === 'owner' || r === 'manager'
  })

  const canAssignWorkOrderTechnician =
    canEditWoModule && (isAdmin(role) || role === 'service_advisor')

  // Use same tenant_users.id source as server actions (admin-backed), not RLS-scoped getCurrentTenantUser,
  // so assignment checks match denyUnlessMayMutateWorkOrder for technicians.
  const currentTenantUserId = dashboardDu?.tenantUserId ?? ''
  const canMutateWorkOrder =
    canEditWoModule &&
    technicianMayMutateAssignedRecord(
      role,
      workOrder.technician_id ?? null,
      currentTenantUserId || '__no_user__',
    )

  const assignmentReadOnlyBanner =
    canEditWoModule && !canMutateWorkOrder && role === 'technician'
      ? workOrder.technician_id
        ? 'You can view this work order but only the assigned technician can change it.'
        : 'No technician is assigned. A service advisor must assign you before you can update this work order.'
      : null

  const assignedTechnician = workOrder.technician_id
    ? await getTenantUserById(tenantId, workOrder.technician_id)
    : null

  return (
    <>
      <Topbar
        title={workOrder.work_order_number ?? 'Work Order'}
        subtitle={subtitle}
        action={{ label: '← Active Jobs', href: '/dashboard/work-orders' }}
      />
      <WorkOrderDetail
        workOrder={workOrder}
        customerName={customerName}
        vehicleLabel={vehicleLabel}
        canEditWorkOrders={canMutateWorkOrder}
        canEditInvoices={canEditInvoices}
        canEditInspections={canEditInspections}
        linkedInspections={linkedInspections}
        canAssignWorkOrderTechnician={canAssignWorkOrderTechnician}
        teamUsersForAssignment={assignableTeamUsers}
        assignedTechnician={assignedTechnician}
        assignmentReadOnlyBanner={assignmentReadOnlyBanner}
        showTechnicianSelfAssign={role === 'technician' && !workOrder.technician_id}
      />
    </>
  )
}
