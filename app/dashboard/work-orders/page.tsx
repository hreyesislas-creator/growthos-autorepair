import { notFound }           from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import { createAdminClient }  from '@/lib/supabase/server'
import { getCurrentAppRoleForTenant } from '@/lib/auth/roles'
import { getCurrentTenantUser, getTeamUsers } from '@/lib/queries'
import {
  parseAssignmentListScope,
  parseAdvisorTechnicianFilterParam,
  technicianNameMapFromTeamUsers,
  advisorTechnicianFilterOptionsFromTeamUsers,
  validatedAdvisorTechnicianId,
  canUseAdvisorTechnicianFilter,
} from '@/lib/dashboard/assignment-list-helpers'
import Topbar                 from '@/components/dashboard/Topbar'
import WorkOrdersList         from './WorkOrdersList'

export const metadata = { title: 'Work Orders' }

// ── Resolved row shape passed to the client component ────────────────────────
export type WorkOrderListRow = {
  id:                string
  work_order_number: string | null
  status:            string
  total:             number
  created_at:        string
  estimate_id:       string
  estimate_number:   string | null   // soft copy on the WO row
  customerName:      string | null
  vehicleLabel:      string | null
  technician_id:     string | null
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: { scope?: string; tech?: string }
}) {
  const ctx = await getDashboardTenant()
  if (!ctx) return notFound()

  const tenantId = ctx.tenant.id
  const supabase = await createAdminClient()

  // ── Step 1: Fetch work orders ─────────────────────────────────────────────
  const { data: rawRows, error } = await supabase
    .from('work_orders')
    .select('id, work_order_number, status, total, created_at, estimate_id, estimate_number, customer_id, vehicle_id, technician_id')
    .eq('tenant_id', tenantId)
    .eq('is_archived', false)          // Phase A: hide archived records from list
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[WorkOrdersPage] work_orders query failed:', error.message)
  }

  const rows = rawRows ?? []

  // ── Step 2: Collect unique FK ids ─────────────────────────────────────────
  const customerIds = [...new Set(
    rows.map(r => r.customer_id as string | null).filter((id): id is string => !!id),
  )]
  const vehicleIds = [...new Set(
    rows.map(r => r.vehicle_id as string | null).filter((id): id is string => !!id),
  )]

  // ── Step 3: Bulk-fetch customers and vehicles ─────────────────────────────
  const [customersRes, vehiclesRes] = await Promise.all([
    customerIds.length > 0
      ? supabase
          .from('customers')
          .select('id, first_name, last_name')
          .in('id', customerIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string }[], error: null }),
    vehicleIds.length > 0
      ? supabase
          .from('vehicles')
          .select('id, year, make, model')
          .in('id', vehicleIds)
      : Promise.resolve({ data: [] as { id: string; year: number | null; make: string | null; model: string | null }[], error: null }),
  ])

  if (customersRes.error) console.error('[WorkOrdersPage] customers query:', customersRes.error.message)
  if (vehiclesRes.error)  console.error('[WorkOrdersPage] vehicles query:',  vehiclesRes.error.message)

  // ── Step 4: Build lookup maps ─────────────────────────────────────────────
  const customerMap = new Map((customersRes.data ?? []).map(c => [c.id, c]))
  const vehicleMap  = new Map((vehiclesRes.data  ?? []).map(v => [v.id, v]))

  // ── Step 5: Build resolved rows ───────────────────────────────────────────
  const workOrders: WorkOrderListRow[] = rows.map(r => {
    const cId = r.customer_id as string | null
    const vId = r.vehicle_id  as string | null
    const c   = cId ? customerMap.get(cId) : undefined
    const v   = vId ? vehicleMap.get(vId)  : undefined

    return {
      id:                r.id,
      work_order_number: r.work_order_number,
      status:            r.status,
      total:             Number(r.total),
      created_at:        r.created_at,
      estimate_id:       r.estimate_id,
      estimate_number:   r.estimate_number ?? null,
      customerName:      c ? `${c.first_name} ${c.last_name}`.trim() : null,
      vehicleLabel:      v ? [v.year, v.make, v.model].filter(Boolean).join(' ') : null,
      technician_id:     (r.technician_id as string | null) ?? null,
    }
  })

  const [appRole, currentTu, teamUsers] = await Promise.all([
    getCurrentAppRoleForTenant(),
    getCurrentTenantUser(tenantId),
    getTeamUsers(tenantId),
  ])
  const assignmentScope = parseAssignmentListScope(searchParams?.scope)
  const advisorTechParsed = parseAdvisorTechnicianFilterParam(searchParams?.tech, appRole)
  const advisorTechnicianId = validatedAdvisorTechnicianId(advisorTechParsed, teamUsers)
  const technicianNameById = technicianNameMapFromTeamUsers(teamUsers)
  const advisorTechnicianOptions = advisorTechnicianFilterOptionsFromTeamUsers(teamUsers)
  const showAdvisorTechFilter = canUseAdvisorTechnicianFilter(appRole)

  return (
    <>
      <Topbar title="Work Orders" />
      <WorkOrdersList
        workOrders={workOrders}
        assignmentScope={assignmentScope}
        appRole={appRole}
        currentTenantUserId={currentTu?.id ?? ''}
        advisorTechnicianId={advisorTechnicianId}
        technicianNameById={technicianNameById}
        advisorTechnicianOptions={advisorTechnicianOptions}
        showAdvisorTechFilter={showAdvisorTechFilter}
      />
    </>
  )
}
