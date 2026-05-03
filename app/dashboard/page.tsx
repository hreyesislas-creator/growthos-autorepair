import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import {
  getTodayAppointments,
  getCustomerCount,
  getVehicleCount,
  getPendingInspectionCount,
  getWeeklyMessageCount,
  getBillingSnapshot,
  getEstimatesByTenant,
  getWorkOrdersForTenant,
  getCustomerPipelineSummaries,
  getVehiclePipelineSummaries,
  getTenantUsersByIds,
  type CustomerPipelineSummary,
  type VehiclePipelineSummary,
  type TenantUserPipelineSummary,
  getCompletedWorkOrderCounts,
  getRevenueOpportunitiesSummary,
  getInspections,
  getTechnicianWeekWorkOrderMetrics,
  getShopAnnouncementsForTenant,
  getWorkOrderAssignmentsForBoard,
  type WorkOrderAssignmentBoardRow,
} from '@/lib/queries'
import { getFinancialDashboardData } from '@/lib/financial-queries'
import { canEditDashboardModule, getCurrentAppRoleForTenant } from '@/lib/auth/roles'
import { getCurrentDashboardTenantUser, technicianMayMutateAssignedRecord } from '@/lib/auth/operational-assignment'
import Topbar from '@/components/dashboard/Topbar'
import TechnicianOverview from '@/components/dashboard/TechnicianOverview'
import StatusBadge from '@/components/dashboard/StatusBadge'
import PipelineJobBoardCard from '@/components/dashboard/PipelineJobBoardCard'
import WorkOrderOperationalStatusPicker from '@/components/dashboard/WorkOrderOperationalStatusPicker'
import Link from 'next/link'
import { differenceInCalendarDays, differenceInMinutes, format, parseISO, startOfDay } from 'date-fns'
import type { Estimate, WorkOrder, WorkOrderAssignmentRole } from '@/lib/types'

export const metadata = { title: 'Overview' }

const PIPELINE_LIMIT = 7

const PENDING_PIPELINE_ESTIMATE_STATUSES = new Set(['draft', 'presented', 'reopened'])

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--text-3)',
  marginBottom: 12,
}

type KpiAccent = 'revenue' | 'yellow' | 'blue' | 'green' | 'neutral'

function kpiTileStyles(accent: KpiAccent): React.CSSProperties {
  const base: React.CSSProperties = {
    height: '100%',
    minHeight: 108,
    padding: '16px 14px',
    borderRadius: 12,
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
    boxShadow: 'var(--shadow-card)',
  }
  switch (accent) {
    case 'revenue':
      return {
        ...base,
        background: 'linear-gradient(145deg, #f0fdf4 0%, #ffffff 55%)',
        borderLeft: '4px solid #16a34a',
      }
    case 'yellow':
      return {
        ...base,
        background: 'linear-gradient(145deg, #fffbeb 0%, #ffffff 55%)',
        borderLeft: '4px solid #f59e0b',
      }
    case 'blue':
      return {
        ...base,
        background: 'linear-gradient(145deg, #eff6ff 0%, #ffffff 55%)',
        borderLeft: '4px solid #2563eb',
      }
    case 'green':
      return {
        ...base,
        background: 'linear-gradient(145deg, #f0fdf4 0%, #ffffff 55%)',
        borderLeft: '4px solid #16a34a',
      }
    default:
      return { ...base, background: 'var(--surface)' }
  }
}

type OverviewKpiItem = {
  label: string
  value: string | number
  hint: string
  href: string
  accent: KpiAccent
  monoValue?: boolean
}

const overviewKpiGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 12,
}

function OverviewKpi({ label, value, hint, href, accent, monoValue }: OverviewKpiItem) {
  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={kpiTileStyles(accent)}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-3)',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: accent === 'revenue' ? 26 : 22,
            fontWeight: 800,
            lineHeight: 1.1,
            color: 'var(--text)',
            fontFamily: monoValue ? 'var(--font-mono)' : 'inherit',
            marginTop: 8,
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.35 }}>
          {hint}
        </div>
      </div>
    </Link>
  )
}

/** Subtle left accent for pipeline lanes (optional; shell uses standard border). */
const pipelineCardBorder = {
  estimates: '1px solid var(--border)',
  workOrders: '1px solid var(--border)',
  completed: '1px solid var(--border)',
} as const

/** Shared shell for pipeline job links (typography / spacing handled in children). */
const pipelineJobCardShell: React.CSSProperties = {
  display: 'block',
  textDecoration: 'none',
  color: 'inherit',
  padding: '14px 16px',
  borderRadius: 12,
  background: 'var(--surface)',
}

/** Slightly tighter padding for advisor queue rows (same visual hierarchy as pipeline cards). */
const advisorQueueCardShell: React.CSSProperties = {
  ...pipelineJobCardShell,
  padding: '12px 14px',
}

const advisorQueueInspectionBorder = '1px solid var(--border)' as const
const advisorQueueMessagesBorder = '1px solid var(--border)' as const

function pipelineEstimateDoc(e: Estimate): string {
  return e.estimate_number?.trim() || 'EST'
}

function pipelineWorkOrderDoc(w: WorkOrder): string {
  return w.work_order_number?.trim() || 'RO'
}

/** Uses only fields already on the work order row (no extra fetches). */
function pipelineWorkOrderProgressHint(w: WorkOrder, phase: 'active' | 'completed'): string | null {
  if (phase === 'completed' && w.actual_hours != null && w.actual_hours > 0) {
    return `Shop time · ${w.actual_hours}h`
  }
  if (phase !== 'active' || !w.started_at) return null
  const s = parseISO(w.started_at)
  if (Number.isNaN(s.getTime())) return null
  const mins = differenceInMinutes(new Date(), s)
  if (mins < 0) return null
  if (mins < 60) return `In shop · ${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `In shop · ${h}h ${m}m` : `In shop · ${h}h`
}

function pipelineCustomerNameFromRow(row: CustomerPipelineSummary | undefined): string {
  if (!row) return '—'
  const parts = [row.first_name, row.last_name].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : '—'
}

function pipelineVehicleLabelFromRow(row: VehiclePipelineSummary | undefined): string {
  if (!row) return '—'
  const parts = [row.year, row.make, row.model].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : '—'
}

function pipelineTechnicianInitials(
  row: TenantUserPipelineSummary | undefined,
): { initials: string; displayName: string } | null {
  if (!row) return null
  const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    let initials: string
    if (parts.length >= 2) {
      const a = parts[0]?.[0] ?? ''
      const b = parts[parts.length - 1]?.[0] ?? ''
      initials = (a + b).toUpperCase()
    } else if (parts.length === 1) {
      const w = parts[0] ?? ''
      initials = w.length >= 2 ? (w[0]! + w[1]!).toUpperCase() : (w[0] ?? '').toUpperCase()
    } else {
      return null
    }
    const cleaned = initials.replace(/\s/g, '')
    if (!cleaned) return null
    return { initials: cleaned.slice(0, 2), displayName: name }
  }
  const em = row.email?.trim()
  if (em?.includes('@')) {
    const local = em.split('@')[0] ?? ''
    if (local.length >= 2) return { initials: (local[0]! + local[1]!).toUpperCase(), displayName: em }
    if (local.length === 1) return { initials: local[0]!.toUpperCase(), displayName: em }
  }
  return null
}

const PIPELINE_ASSIGNMENT_ROLE_ORDER: Record<WorkOrderAssignmentRole, number> = {
  technician: 0,
  advisor: 1,
  supervisor: 2,
  qc: 3,
}

function workOrderAssignmentRoleLabel(role: WorkOrderAssignmentRole): string {
  switch (role) {
    case 'technician':
      return 'Technician'
    case 'advisor':
      return 'Advisor'
    case 'supervisor':
      return 'Supervisor'
    case 'qc':
      return 'QC'
    default:
      return role
  }
}

type PipelineAssignmentAvatarItem = {
  key: string
  initials: string
  title: string
  role: WorkOrderAssignmentRole
}

function pipelineAssignmentAvatarItemsFromRows(rows: WorkOrderAssignmentBoardRow[]): PipelineAssignmentAvatarItem[] {
  return rows.flatMap(r => {
    const t = pipelineTechnicianInitials({
      id: r.tenant_user_id,
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
    })
    if (!t) return []
    const primaryNote = r.is_primary && r.assignment_role === 'technician' ? ' (primary)' : ''
    const title = `${t.displayName} · ${workOrderAssignmentRoleLabel(r.assignment_role)}${primaryNote}`
    return [
      {
        key: `${r.work_order_id}:${r.tenant_user_id}:${r.assignment_role}`,
        initials: t.initials,
        title,
        role: r.assignment_role,
      },
    ]
  })
}

function PipelineJobCardHeader(props: {
  customerLabel: string
  customerPhone?: string | null
  docLabel: string
  techInitials?: string | null
  techTooltip?: string | null
  /** From work_order_assignments; when non-empty, hides legacy single tech avatar. */
  assignmentAvatars?: PipelineAssignmentAvatarItem[] | null
  assignmentOverflowCount?: number
  assignmentOverflowTitle?: string | null
}) {
  const {
    customerLabel,
    customerPhone,
    docLabel,
    techInitials,
    techTooltip,
    assignmentAvatars,
    assignmentOverflowCount,
    assignmentOverflowTitle,
  } = props
  const showAssignmentStack = assignmentAvatars != null && assignmentAvatars.length > 0
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 8,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.3, color: 'var(--text)' }}>{customerLabel}</div>
        {customerPhone ? (
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-2)',
              marginTop: 2,
              lineHeight: 1.3,
            }}
          >
            {customerPhone}
          </div>
        ) : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexShrink: 0 }}>
        {showAssignmentStack ? (
          <div className="pipeline-assignment-stack">
            {assignmentAvatars!.map(a => (
              <span
                key={a.key}
                className={`pipeline-assignment-avatar pipeline-assignment-avatar--${a.role}`}
                title={a.title}
                aria-label={a.title}
                style={{ fontSize: a.initials.length > 1 ? 9 : 10 }}
              >
                {a.initials}
              </span>
            ))}
            {assignmentOverflowCount != null && assignmentOverflowCount > 0 ? (
              <span
                className="pipeline-assignment-more"
                title={assignmentOverflowTitle ?? undefined}
                aria-label={assignmentOverflowTitle ?? `${assignmentOverflowCount} more team members`}
              >
                +{assignmentOverflowCount}
              </span>
            ) : null}
          </div>
        ) : techInitials ? (
          <span
            className="pipeline-tech-avatar"
            title={techTooltip ?? undefined}
            aria-label={techTooltip ?? techInitials}
            style={{ fontSize: techInitials.length > 1 ? 10 : 11 }}
          >
            {techInitials}
          </span>
        ) : null}
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-2)',
            lineHeight: 1.25,
            textAlign: 'right',
            maxWidth: 128,
            wordBreak: 'break-word',
          }}
        >
          {docLabel}
        </div>
      </div>
    </div>
  )
}

const advisorQueueStageLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--text-2)',
  marginBottom: 6,
}

function AdvisorQueueStageLabel({ text }: { text: string }) {
  return <div style={advisorQueueStageLabelStyle}>{text}</div>
}

type PipelineAgingBucket = 'fresh' | 'recent' | 'stale' | 'urgent'

/** Calendar days since `iso` (local); 0 = today; clamped ≥0. */
function pipelineCalendarAgeDays(iso: string | null | undefined): number {
  if (!iso) return 0
  const d = parseISO(iso)
  if (Number.isNaN(d.getTime())) return 0
  return Math.max(0, differenceInCalendarDays(startOfDay(new Date()), startOfDay(d)))
}

function pipelineAgingShortSuffix(days: number): string {
  if (days <= 0) return 'today'
  if (days === 1) return '1 day'
  if (days < 5) return `${days} days`
  return '5+ days'
}

function pipelineAgingBucket(days: number): PipelineAgingBucket {
  if (days <= 0) return 'fresh'
  if (days <= 2) return 'recent'
  if (days <= 4) return 'stale'
  return 'urgent'
}

function estimatePipelineAging(updatedAt: string): { line: string; bucket: PipelineAgingBucket } {
  const days = pipelineCalendarAgeDays(updatedAt)
  const bucket = pipelineAgingBucket(days)
  const suf = pipelineAgingShortSuffix(days)
  const line = days <= 0 ? 'Updated today' : `Waiting · ${suf}`
  return { line, bucket }
}

function activeWorkOrderPipelineAging(updatedAt: string): { line: string; bucket: PipelineAgingBucket } {
  const days = pipelineCalendarAgeDays(updatedAt)
  const bucket = pipelineAgingBucket(days)
  const suf = pipelineAgingShortSuffix(days)
  const line = days <= 0 ? 'Updated today' : `Open · ${suf}`
  return { line, bucket }
}

function completedWorkOrderPipelineAging(
  completedAt: string | null | undefined,
  updatedAt: string,
): { line: string; bucket: PipelineAgingBucket } {
  const ref = completedAt ?? updatedAt
  const days = pipelineCalendarAgeDays(ref)
  const bucket = pipelineAgingBucket(days)
  const suf = pipelineAgingShortSuffix(days)
  const line = days <= 0 ? 'Completed today' : `Ready · ${suf}`
  return { line, bucket }
}

export default async function DashboardPage() {
  const ctx = await getDashboardTenant()
  if (!ctx) return notFound()

  const tenantId = ctx.tenant.id
  const today    = format(new Date(), 'EEEE, MMM d')

  const [role, dashboardDu] = await Promise.all([
    getCurrentAppRoleForTenant(),
    getCurrentDashboardTenantUser(),
  ])

  if (role === 'technician') {
    const technicianId = dashboardDu?.tenantUserId ?? null
    const [workOrders, inspections, metrics, shopAnnouncements] = technicianId
      ? await Promise.all([
          getWorkOrdersForTenant(tenantId, 200, { technicianIdEq: technicianId }),
          getInspections(tenantId, { technicianIdEq: technicianId }),
          getTechnicianWeekWorkOrderMetrics(tenantId, technicianId),
          getShopAnnouncementsForTenant(tenantId, 20),
        ])
      : await Promise.all([
          Promise.resolve([]),
          Promise.resolve([]),
          Promise.resolve({
            weekRevenue: 0,
            completedThisWeek: 0,
            averageTicket: 0,
          }),
          getShopAnnouncementsForTenant(tenantId, 20),
        ])

    return (
      <>
        <Topbar title="My work" subtitle={today} />
        <div className="dash-content">
          <TechnicianOverview
            workOrders={workOrders}
            inspections={inspections}
            performance={metrics}
            shopAnnouncements={shopAnnouncements}
            missingTechnicianProfile={!technicianId}
          />
        </div>
      </>
    )
  }

  const [
    todayAppts,
    custCount,
    vehCount,
    pendingInsp,
    msgCount,
    billing,
    financial,
    estimates,
    workOrders,
    woCompleted,
    revenueOpportunities,
    canEditWoModule,
  ] = await Promise.all([
    getTodayAppointments(tenantId),
    getCustomerCount(tenantId),
    getVehicleCount(tenantId),
    getPendingInspectionCount(tenantId),
    getWeeklyMessageCount(tenantId),
    getBillingSnapshot(tenantId),
    getFinancialDashboardData(tenantId),
    getEstimatesByTenant(tenantId),
    getWorkOrdersForTenant(tenantId),
    getCompletedWorkOrderCounts(tenantId),
    getRevenueOpportunitiesSummary(tenantId),
    canEditDashboardModule('work_orders'),
  ])

  const pipelineEstimates = estimates
    .filter(e => PENDING_PIPELINE_ESTIMATE_STATUSES.has(e.status))
    .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
    .slice(0, PIPELINE_LIMIT)

  const inProgressWO = workOrders
    .filter(w => w.status === 'in_progress' || w.status === 'ready')
    .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
    .slice(0, PIPELINE_LIMIT)

  const completedWO = workOrders
    .filter(w => w.status === 'completed')
    .sort((a, b) =>
      (a.completed_at ?? a.updated_at).localeCompare(b.completed_at ?? b.updated_at),
    )
    .slice(0, PIPELINE_LIMIT)

  const custIds = new Set<string>()
  const vehIds = new Set<string>()
  for (const e of pipelineEstimates) {
    if (e.customer_id) custIds.add(e.customer_id)
    if (e.vehicle_id) vehIds.add(e.vehicle_id)
  }
  for (const w of [...inProgressWO, ...completedWO]) {
    if (w.customer_id) custIds.add(w.customer_id)
    if (w.vehicle_id) vehIds.add(w.vehicle_id)
  }
  const boardWoIds = [...inProgressWO, ...completedWO].map(w => w.id)
  console.log('[Board WO IDS]', boardWoIds)

  const techIds = new Set<string>()
  for (const w of [...inProgressWO, ...completedWO]) {
    if (w.technician_id) techIds.add(w.technician_id)
  }
  const [customerRows, vehicleRows, tenantUserRows, assignmentBoardRows] = await Promise.all([
    getCustomerPipelineSummaries([...custIds]),
    getVehiclePipelineSummaries([...vehIds]),
    getTenantUsersByIds(tenantId, [...techIds]),
    getWorkOrderAssignmentsForBoard(tenantId, boardWoIds),
  ])
  console.log('[Assignments Rows]', assignmentBoardRows.length)

  const customerPipelineMap = new Map<string, CustomerPipelineSummary>()
  for (const r of customerRows) customerPipelineMap.set(r.id, r)
  const vehiclePipelineMap = new Map<string, VehiclePipelineSummary>()
  for (const r of vehicleRows) vehiclePipelineMap.set(r.id, r)
  const technicianPipelineMap = new Map<string, { initials: string; displayName: string }>()
  for (const r of tenantUserRows) {
    const t = pipelineTechnicianInitials(r)
    if (t) technicianPipelineMap.set(r.id, t)
  }

  const workOrderAssignmentBoardMap = new Map<string, WorkOrderAssignmentBoardRow[]>()
  for (const r of assignmentBoardRows) {
    const list = workOrderAssignmentBoardMap.get(r.work_order_id) ?? []
    list.push(r)
    workOrderAssignmentBoardMap.set(r.work_order_id, list)
  }
  for (const list of workOrderAssignmentBoardMap.values()) {
    list.sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
      const oa = PIPELINE_ASSIGNMENT_ROLE_ORDER[a.assignment_role]
      const ob = PIPELINE_ASSIGNMENT_ROLE_ORDER[b.assignment_role]
      if (oa !== ob) return oa - ob
      return a.tenant_user_id.localeCompare(b.tenant_user_id)
    })
  }

  function pipelineWoHeaderAssignmentProps(w: WorkOrder): {
    techInitials?: string | null
    techTooltip?: string | null
    assignmentAvatars?: PipelineAssignmentAvatarItem[] | null
    assignmentOverflowCount?: number
    assignmentOverflowTitle?: string | null
  } {
    const rows = workOrderAssignmentBoardMap.get(w.id)
    if (rows && rows.length > 0) {
      const items = pipelineAssignmentAvatarItemsFromRows(rows)
      if (items.length > 0) {
        const visible = items.slice(0, 4)
        const rest = items.slice(4)
        return {
          assignmentAvatars: visible,
          assignmentOverflowCount: rest.length > 0 ? rest.length : undefined,
          assignmentOverflowTitle: rest.length > 0 ? rest.map(x => x.title).join('\n') : null,
        }
      }
    }
    const tech = w.technician_id ? technicianPipelineMap.get(w.technician_id) : undefined
    return {
      techInitials: tech?.initials ?? null,
      techTooltip: tech?.displayName ?? null,
    }
  }

  const currentTenantUserIdForWo = dashboardDu?.tenantUserId ?? ''
  function pipelineWorkOrderCanMutate(w: WorkOrder): boolean {
    if (!canEditWoModule) return false
    return technicianMayMutateAssignedRecord(
      role,
      w.technician_id ?? null,
      currentTenantUserIdForWo || '__no_user__',
    )
  }

  const fmtMoney = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const activeJobCount = financial.carsInServiceCount

  const overviewRow1: OverviewKpiItem[] = [
    {
      label: "Today's cash",
      value: fmtMoney(financial.revenueToday),
      hint: 'Payments recorded today',
      href: '/dashboard/invoices',
      accent: 'revenue',
      monoValue: true,
    },
    {
      label: 'Cash this week',
      value: fmtMoney(financial.revenueThisWeek),
      hint: 'Payments (week to date)',
      href: '/dashboard/invoices',
      accent: 'revenue',
      monoValue: true,
    },
    {
      label: 'Cash this month',
      value: fmtMoney(financial.revenueThisMonth),
      hint: 'Payments (month to date)',
      href: '/dashboard/invoices',
      accent: 'revenue',
      monoValue: true,
    },
    {
      label: 'Active jobs',
      value: activeJobCount,
      hint: 'Ready + in progress',
      href: '/dashboard/work-orders',
      accent: 'blue',
    },
    {
      label: 'Vehicles in shop',
      value: activeJobCount,
      hint: 'Active work orders (same as jobs for now)',
      href: '/dashboard/work-orders',
      accent: 'blue',
    },
  ]

  const overviewRow2: OverviewKpiItem[] = [
    {
      label: 'Completed today',
      value: woCompleted.completedToday,
      hint: 'Work orders marked complete',
      href: '/dashboard/work-orders',
      accent: 'green',
    },
    {
      label: 'Completed this week',
      value: woCompleted.completedThisWeek,
      hint: 'Week to date',
      href: '/dashboard/work-orders',
      accent: 'green',
    },
  ]

  const overviewAll = [...overviewRow1, ...overviewRow2]

  /** Owner / admin dashboard only: cash KPIs, revenue opportunities, billing summary, pipeline dollar amounts. */
  const canViewFinancialOverview = role === 'admin'
  const isServiceAdvisor = role === 'service_advisor'

  const FINANCIAL_OVERVIEW_KPIS = new Set<string>(["Today's cash", 'Cash this week', 'Cash this month'])
  const overviewDisplayed = canViewFinancialOverview
    ? overviewAll
    : overviewAll.filter(item => !FINANCIAL_OVERVIEW_KPIS.has(item.label))

  const secondaryKpis: {
    label: string
    value: number
    hint: string
    href: string
    accent?: 'blue'
  }[] = [
    { label: 'Customers', value: custCount, hint: 'Active', href: '/dashboard/customers' },
    { label: 'Vehicles', value: vehCount, hint: 'On file', href: '/dashboard/vehicles' },
    { label: 'Inspections', value: pendingInsp, hint: 'Pending review', href: '/dashboard/inspections' },
    { label: 'Messages', value: msgCount, hint: 'This week', href: '/dashboard/communications', accent: 'blue' },
  ]

  const secondaryKpisDisplayed = isServiceAdvisor
    ? secondaryKpis.filter(k => k.label !== 'Messages')
    : secondaryKpis

  const dashboardHeaderQuickLinks = [
    { label: 'New Appointment', href: '/dashboard/appointments' },
    { label: 'Add Customer', href: '/dashboard/customers' },
    { label: 'Add Vehicle', href: '/dashboard/vehicles' },
    { label: 'Inspection', href: '/dashboard/inspections' },
  ]

  const inset: React.CSSProperties = {
    padding: '14px 16px',
    borderRadius: 10,
    border: '1px solid var(--border-2)',
    background: 'var(--bg-2)',
  }

  const topbarTitle = canViewFinancialOverview ? 'Dashboard' : "Today's Operations"
  const topbarSubtitle = canViewFinancialOverview
    ? today
    : isServiceAdvisor
      ? 'Focus on appointments, active jobs, inspections, approvals, and vehicles ready for pickup.'
      : `${today} · Focus on today's appointments, active jobs, inspections, and vehicles ready for pickup.`

  const plMainTitle = isServiceAdvisor ? 'Daily pipeline' : 'Shop pipeline'
  const plMainSub = isServiceAdvisor
    ? 'Waiting on approval, in progress, and ready for pickup.'
    : 'Estimates awaiting action, active work, and completed jobs'
  const plEstTitle = isServiceAdvisor ? 'Waiting on approval' : 'Estimates'
  const plEstSub = 'Pending customer approval or follow-up'
  const plWoTitle = isServiceAdvisor ? 'In progress' : 'Work orders'
  const plWoSub = 'Work currently in the shop'
  const plDoneTitle = isServiceAdvisor ? 'Ready for pickup' : 'Completed / ready'
  const plDoneSub = 'Completed — notify customer'

  const pipelineColDescStyle: React.CSSProperties = {
    fontSize: 13,
    color: 'var(--text-2)',
    lineHeight: 1.45,
    marginBottom: 12,
    marginTop: 2,
  }

  const scheduleEl = (
    <div style={{ marginBottom: 24 }}>
      <div className="card">
        <div className="section-header">
          <div>
            <div className="section-title">Today&apos;s schedule</div>
            <div className="section-subtitle">{today}</div>
          </div>
          <Link href="/dashboard/appointments" className="btn-ghost">
            Calendar
          </Link>
        </div>
        {todayAppts.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 12px' }}>
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-title">Clear calendar</div>
            <div className="empty-state-body">No appointments on the books for today.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {todayAppts.slice(0, 6).map(a => (
                  <tr key={a.id}>
                    <td
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        color: 'var(--text-3)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {a.appointment_time
                        ? format(new Date(`2000-01-01T${a.appointment_time}`), 'h:mm a')
                        : '—'}
                    </td>
                    <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                      {a.customer ? `${a.customer.first_name} ${a.customer.last_name}` : '—'}
                    </td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {todayAppts.length > 6 && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '10px 0 0', textAlign: 'center' }}>
                +{todayAppts.length - 6} more —{' '}
                <Link href="/dashboard/appointments" style={{ color: '#2563eb', fontWeight: 600 }}>
                  view all
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  const pipelineEl = (
    <div className="card" style={{ marginBottom: 24, padding: '18px 18px 16px' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <div style={sectionLabel}>{plMainTitle}</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: -4 }}>{plMainSub}</div>
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}
      >
        {/* Column 1 — Estimates / waiting on approval */}
        <div className="pipeline-column pipeline-column--estimates">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
              <div className="pipeline-col-title">{plEstTitle}</div>
              <span className="pipeline-count-badge">{pipelineEstimates.length}</span>
            </div>
            <Link href="/dashboard/estimates" className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}>
              All
            </Link>
          </div>
          <div style={pipelineColDescStyle}>{plEstSub}</div>
          {pipelineEstimates.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-2)', padding: '12px 0' }}>None in this stage.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pipelineEstimates.map(e => {
                const aging = estimatePipelineAging(e.updated_at)
                const custRow = e.customer_id ? customerPipelineMap.get(e.customer_id) : undefined
                const vehRow = e.vehicle_id ? vehiclePipelineMap.get(e.vehicle_id) : undefined
                const cust = e.customer_id ? pipelineCustomerNameFromRow(custRow) : '—'
                const phone = custRow?.phone?.trim() || null
                const veh = e.vehicle_id ? pipelineVehicleLabelFromRow(vehRow) : '—'
                const plate = vehRow?.license_plate?.trim() || null
                return (
                  <li key={e.id}>
                    <PipelineJobBoardCard
                      detailHref={`/dashboard/estimates/${e.id}`}
                      shellStyle={{ ...pipelineJobCardShell, border: pipelineCardBorder.estimates }}
                      customerPhone={phone}
                      smsCustomerName={cust}
                      smsVehicleLine={veh}
                      shopName={ctx.tenant.name}
                      isEstimate
                    >
                      <PipelineJobCardHeader
                        customerLabel={cust}
                        customerPhone={phone}
                        docLabel={pipelineEstimateDoc(e)}
                      />
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: 'var(--text-2)',
                          lineHeight: 1.45,
                          marginBottom: 2,
                        }}
                      >
                        {veh}
                      </div>
                      {plate ? (
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--text-2)',
                            lineHeight: 1.35,
                            marginTop: 2,
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {plate}
                        </div>
                      ) : null}
                      <div className={`pipeline-aging pipeline-aging--${aging.bucket}`}>{aging.line}</div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: canViewFinancialOverview ? 'space-between' : 'flex-end',
                          alignItems: 'center',
                          gap: 10,
                          marginTop: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        {canViewFinancialOverview && (
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                              color: 'var(--text)',
                            }}
                          >
                            {fmtMoney(e.total)}
                          </span>
                        )}
                        <StatusBadge status={e.status} />
                      </div>
                    </PipelineJobBoardCard>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Column 2 — Work orders (active) */}
        <div className="pipeline-column pipeline-column--workorders">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
              <div className="pipeline-col-title">{plWoTitle}</div>
              <span className="pipeline-count-badge">{inProgressWO.length}</span>
            </div>
            <Link href="/dashboard/work-orders" className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}>
              All
            </Link>
          </div>
          <div style={pipelineColDescStyle}>{plWoSub}</div>
          {inProgressWO.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-2)', padding: '12px 0' }}>Bay clear.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {inProgressWO.map(w => {
                const aging = activeWorkOrderPipelineAging(w.updated_at)
                const prog = pipelineWorkOrderProgressHint(w, 'active')
                const custRow = w.customer_id ? customerPipelineMap.get(w.customer_id) : undefined
                const vehRow = w.vehicle_id ? vehiclePipelineMap.get(w.vehicle_id) : undefined
                const cust = w.customer_id ? pipelineCustomerNameFromRow(custRow) : '—'
                const phone = custRow?.phone?.trim() || null
                const veh = w.vehicle_id ? pipelineVehicleLabelFromRow(vehRow) : '—'
                const plate = vehRow?.license_plate?.trim() || null
                return (
                  <li key={w.id}>
                    <PipelineJobBoardCard
                      detailHref={`/dashboard/work-orders/${w.id}`}
                      shellStyle={{ ...pipelineJobCardShell, border: pipelineCardBorder.workOrders }}
                      customerPhone={phone}
                      smsCustomerName={cust}
                      smsVehicleLine={veh}
                      shopName={ctx.tenant.name}
                    >
                      <PipelineJobCardHeader
                        customerLabel={cust}
                        customerPhone={phone}
                        docLabel={pipelineWorkOrderDoc(w)}
                        {...pipelineWoHeaderAssignmentProps(w)}
                      />
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: 'var(--text-2)',
                          lineHeight: 1.45,
                          marginBottom: 2,
                        }}
                      >
                        {veh}
                      </div>
                      {plate ? (
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--text-2)',
                            lineHeight: 1.35,
                            marginTop: 2,
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {plate}
                        </div>
                      ) : null}
                      {prog ? (
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--text-2)',
                            marginTop: 4,
                            lineHeight: 1.35,
                          }}
                        >
                          {prog}
                        </div>
                      ) : null}
                      <div className={`pipeline-aging pipeline-aging--${aging.bucket}`}>{aging.line}</div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: canViewFinancialOverview ? 'space-between' : 'flex-end',
                          alignItems: 'center',
                          gap: 10,
                          marginTop: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        {canViewFinancialOverview && (
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                              color: 'var(--text)',
                            }}
                          >
                            {fmtMoney(w.total)}
                          </span>
                        )}
                        <WorkOrderOperationalStatusPicker
                          workOrderId={w.id}
                          operationalStatus={w.operational_status ?? null}
                          lifecycleStatus={w.status}
                          canMutate={pipelineWorkOrderCanMutate(w)}
                        />
                      </div>
                    </PipelineJobBoardCard>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Column 3 — Completed / ready for pickup */}
        <div className="pipeline-column pipeline-column--completed">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
              <div className="pipeline-col-title">{plDoneTitle}</div>
              <span className="pipeline-count-badge">{completedWO.length}</span>
            </div>
            <Link href="/dashboard/work-orders" className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}>
              All
            </Link>
          </div>
          <div style={pipelineColDescStyle}>{plDoneSub}</div>
          {completedWO.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-2)', padding: '12px 0' }}>No completed jobs yet.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {completedWO.map(w => {
                const aging = completedWorkOrderPipelineAging(w.completed_at, w.updated_at)
                const prog = pipelineWorkOrderProgressHint(w, 'completed')
                const custRow = w.customer_id ? customerPipelineMap.get(w.customer_id) : undefined
                const vehRow = w.vehicle_id ? vehiclePipelineMap.get(w.vehicle_id) : undefined
                const cust = w.customer_id ? pipelineCustomerNameFromRow(custRow) : '—'
                const phone = custRow?.phone?.trim() || null
                const veh = w.vehicle_id ? pipelineVehicleLabelFromRow(vehRow) : '—'
                const plate = vehRow?.license_plate?.trim() || null
                return (
                  <li key={w.id}>
                    <PipelineJobBoardCard
                      detailHref={`/dashboard/work-orders/${w.id}`}
                      shellStyle={{ ...pipelineJobCardShell, border: pipelineCardBorder.completed }}
                      customerPhone={phone}
                      smsCustomerName={cust}
                      smsVehicleLine={veh}
                      shopName={ctx.tenant.name}
                      isReadyPickup
                    >
                      <PipelineJobCardHeader
                        customerLabel={cust}
                        customerPhone={phone}
                        docLabel={pipelineWorkOrderDoc(w)}
                        {...pipelineWoHeaderAssignmentProps(w)}
                      />
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: 'var(--text-2)',
                          lineHeight: 1.45,
                          marginBottom: 2,
                        }}
                      >
                        {veh}
                      </div>
                      {plate ? (
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--text-2)',
                            lineHeight: 1.35,
                            marginTop: 2,
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {plate}
                        </div>
                      ) : null}
                      {prog ? (
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--text-2)',
                            marginTop: 4,
                            lineHeight: 1.35,
                          }}
                        >
                          {prog}
                        </div>
                      ) : null}
                      <div className={`pipeline-aging pipeline-aging--${aging.bucket}`}>{aging.line}</div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: canViewFinancialOverview ? 'space-between' : 'flex-end',
                          alignItems: 'center',
                          gap: 10,
                          marginTop: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        {canViewFinancialOverview && (
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                              color: 'var(--text)',
                            }}
                          >
                            {fmtMoney(w.total)}
                          </span>
                        )}
                        <WorkOrderOperationalStatusPicker
                          workOrderId={w.id}
                          operationalStatus={w.operational_status ?? null}
                          lifecycleStatus="completed"
                          lifecycleBadgeLabel="Ready for Pickup"
                          canMutate={pipelineWorkOrderCanMutate(w)}
                        />
                      </div>
                    </PipelineJobBoardCard>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <Topbar title={topbarTitle} subtitle={topbarSubtitle} quickLinks={dashboardHeaderQuickLinks} />
      <div className="dash-content">

        {!isServiceAdvisor && (
          <div className="shop-today-section" style={{ marginBottom: 16 }}>
          <div style={{ ...sectionLabel, marginBottom: 8 }}>
            {canViewFinancialOverview ? 'Shop overview' : 'Operations snapshot'}
          </div>
          <div style={overviewKpiGridStyle}>
            {overviewDisplayed.map(item => (
              <OverviewKpi key={item.label} {...item} />
            ))}
          </div>
          {canViewFinancialOverview && (
            <div className="revenue-opportunities-module">
              <div className="revenue-opportunities-module__head">
                <div className="revenue-opportunities-module__title">Revenue Opportunities</div>
                <p className="revenue-opportunities-module__sub">
                  Money that still needs action — follow up to move revenue today.
                </p>
              </div>
              <div className="revenue-opportunities-module__grid">
                <Link href="/dashboard/estimates" className="revenue-opp-card revenue-opp-card--estimates">
                  <div className="revenue-opp-card__label">Pending Estimates</div>
                  <div className="revenue-opp-card__metrics">
                    <span className="revenue-opp-card__count">{revenueOpportunities.pendingEstimatesCount}</span>
                    <div className="revenue-opp-card__amount-block">
                      <span className="revenue-opp-card__amount">
                        {fmtMoney(revenueOpportunities.pendingEstimatesPotential)}
                      </span>
                      <span className="revenue-opp-card__amount-suffix">potential</span>
                    </div>
                  </div>
                  <div className="revenue-opp-card__footer">
                    <span className="revenue-opp-card__hint">Needs follow-up</span>
                    <span className="revenue-opp-card__cta">View estimates →</span>
                  </div>
                </Link>
                <Link href="/dashboard/work-orders" className="revenue-opp-card revenue-opp-card--pickup">
                  <div className="revenue-opp-card__label">Ready for Pickup</div>
                  <div className="revenue-opp-card__metrics">
                    <span className="revenue-opp-card__count">{revenueOpportunities.readyPickupCount}</span>
                    <div className="revenue-opp-card__amount-block">
                      <span className="revenue-opp-card__amount">
                        {fmtMoney(revenueOpportunities.readyPickupInvoiceTotal)}
                      </span>
                      <span className="revenue-opp-card__amount-suffix">waiting</span>
                    </div>
                  </div>
                  <div className="revenue-opp-card__footer">
                    <span className="revenue-opp-card__hint">Ready to collect</span>
                    <span className="revenue-opp-card__cta">View active jobs →</span>
                  </div>
                </Link>
                <Link href="/dashboard/invoices" className="revenue-opp-card revenue-opp-card--invoices">
                  <div className="revenue-opp-card__label">Unpaid Invoices</div>
                  <div className="revenue-opp-card__metrics">
                    <span className="revenue-opp-card__count">{revenueOpportunities.unpaidInvoiceCount}</span>
                    <div className="revenue-opp-card__amount-block">
                      <span className="revenue-opp-card__amount">
                        {fmtMoney(revenueOpportunities.unpaidOutstanding)}
                      </span>
                      <span className="revenue-opp-card__amount-suffix">outstanding</span>
                    </div>
                  </div>
                  <div className="revenue-opp-card__footer">
                    <span className="revenue-opp-card__hint">Payment follow-up needed</span>
                    <span className="revenue-opp-card__cta">View invoices →</span>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
        )}

        {!isServiceAdvisor && (
        <div className="todays-priorities-module">
          <div className="todays-priorities-module__head">
            <div className="todays-priorities-module__title">Today&apos;s Priorities</div>
            <p className="todays-priorities-module__sub">
              {canViewFinancialOverview
                ? 'Schedule and shop floor — use Revenue Opportunities for money still in play.'
                : 'Arrive, inspect, dispatch, and keep jobs moving — appointments, active work, inspections, and completed vehicles.'}
            </p>
          </div>
          <div className="todays-priorities-module__grid">
            <Link href="/dashboard/appointments" className="today-priority-card today-priority-card--appts">
              <div className="today-priority-card__label">Today&apos;s Appointments</div>
              <div className="today-priority-card__metrics">
                <span className="today-priority-card__count">{todayAppts.length}</span>
              </div>
              <div className="today-priority-card__footer">
                <span className="today-priority-card__hint">Check arrivals</span>
                <span className="today-priority-card__cta">Calendar →</span>
              </div>
            </Link>
            <Link href="/dashboard/work-orders" className="today-priority-card today-priority-card--active-jobs">
              <div className="today-priority-card__label">Active Jobs</div>
              <div className="today-priority-card__metrics">
                <span className="today-priority-card__count">{activeJobCount}</span>
              </div>
              <div className="today-priority-card__footer">
                <span className="today-priority-card__hint">In progress + ready</span>
                <span className="today-priority-card__cta">View jobs →</span>
              </div>
            </Link>
            <Link href="/dashboard/work-orders" className="today-priority-card today-priority-card--completed-today">
              <div className="today-priority-card__label">Completed Today</div>
              <div className="today-priority-card__metrics">
                <span className="today-priority-card__count">{woCompleted.completedToday}</span>
              </div>
              <div className="today-priority-card__footer">
                <span className="today-priority-card__hint">Jobs closed today</span>
                <span className="today-priority-card__cta">View jobs →</span>
              </div>
            </Link>
            <Link href="/dashboard/inspections" className="today-priority-card today-priority-card--inspections">
              <div className="today-priority-card__label">Pending Inspections</div>
              <div className="today-priority-card__metrics">
                <span className="today-priority-card__count">{pendingInsp}</span>
              </div>
              <div className="today-priority-card__footer">
                <span className="today-priority-card__hint">Awaiting review</span>
                <span className="today-priority-card__cta">Inspect →</span>
              </div>
            </Link>
          </div>
        </div>
        )}

        {isServiceAdvisor && (
          <>
            <div className="todays-priorities-module" style={{ marginBottom: 16 }}>
              <div className="todays-priorities-module__head">
                <div className="todays-priorities-module__title">Primary actions</div>
                <p className="todays-priorities-module__sub">
                  Counts only — open the calendar, jobs, inspections, estimates, and pickups.
                </p>
              </div>
              <div className="todays-priorities-module__grid">
                <Link href="/dashboard/appointments" className="today-priority-card today-priority-card--appts">
                  <div className="today-priority-card__label">Today&apos;s Appointments</div>
                  <div className="today-priority-card__metrics">
                    <span className="today-priority-card__count">{todayAppts.length}</span>
                  </div>
                  <div className="today-priority-card__footer">
                    <span className="today-priority-card__hint">Calendar &amp; arrivals</span>
                    <span className="today-priority-card__cta">Open →</span>
                  </div>
                </Link>
                <Link href="/dashboard/work-orders" className="today-priority-card today-priority-card--active-jobs">
                  <div className="today-priority-card__label">Active Jobs</div>
                  <div className="today-priority-card__metrics">
                    <span className="today-priority-card__count">{activeJobCount}</span>
                  </div>
                  <div className="today-priority-card__footer">
                    <span className="today-priority-card__hint">In progress + ready</span>
                    <span className="today-priority-card__cta">Open →</span>
                  </div>
                </Link>
                <Link href="/dashboard/inspections" className="today-priority-card today-priority-card--inspections">
                  <div className="today-priority-card__label">Pending Inspections</div>
                  <div className="today-priority-card__metrics">
                    <span className="today-priority-card__count">{pendingInsp}</span>
                  </div>
                  <div className="today-priority-card__footer">
                    <span className="today-priority-card__hint">Awaiting review</span>
                    <span className="today-priority-card__cta">Open →</span>
                  </div>
                </Link>
                <Link href="/dashboard/estimates" className="today-priority-card today-priority-card--appts">
                  <div className="today-priority-card__label">Estimates needing follow-up</div>
                  <div className="today-priority-card__metrics">
                    <span className="today-priority-card__count">{revenueOpportunities.pendingEstimatesCount}</span>
                  </div>
                  <div className="today-priority-card__footer">
                    <span className="today-priority-card__hint">Present &amp; follow up</span>
                    <span className="today-priority-card__cta">Open →</span>
                  </div>
                </Link>
                <Link href="/dashboard/work-orders" className="today-priority-card today-priority-card--completed-today">
                  <div className="today-priority-card__label">Vehicles ready for pickup</div>
                  <div className="today-priority-card__metrics">
                    <span className="today-priority-card__count">{revenueOpportunities.readyPickupCount}</span>
                  </div>
                  <div className="today-priority-card__footer">
                    <span className="today-priority-card__hint">Notify &amp; release</span>
                    <span className="today-priority-card__cta">Open →</span>
                  </div>
                </Link>
              </div>
            </div>
          </>
        )}

        {pipelineEl}
        {scheduleEl}

        {isServiceAdvisor && (
          <div className="card" style={{ marginBottom: 24, padding: '16px 16px 14px' }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 17,
                fontWeight: 700,
                color: 'var(--navy)',
                letterSpacing: '-0.02em',
                marginBottom: 6,
              }}
            >
              Advisor Action Queue
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.5 }}>
              Next items to touch — approvals, active work, pickups, and customer messages.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingInsp > 0 && (
                <Link
                  href="/dashboard/inspections"
                  className="pipeline-job-card"
                  style={{
                    ...advisorQueueCardShell,
                    border: advisorQueueInspectionBorder,
                    borderLeft: '4px solid rgba(124, 58, 237, 0.5)',
                  }}
                >
                  <AdvisorQueueStageLabel text="Inspection awaiting review" />
                  <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.3, color: 'var(--text)', marginBottom: 4 }}>
                    {pendingInsp} {pendingInsp === 1 ? 'inspection' : 'inspections'}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', lineHeight: 1.45, marginBottom: 4 }}>
                    Review findings and next steps
                  </div>
                  <div className="pipeline-aging pipeline-aging--fresh">
                    {pendingInsp === 1 ? '1 pending on the board' : `${pendingInsp} pending on the board`}
                  </div>
                </Link>
              )}
              {pipelineEstimates.slice(0, 3).map(e => {
                const aging = estimatePipelineAging(e.updated_at)
                const custRow = e.customer_id ? customerPipelineMap.get(e.customer_id) : undefined
                const vehRow = e.vehicle_id ? vehiclePipelineMap.get(e.vehicle_id) : undefined
                const cust = e.customer_id ? pipelineCustomerNameFromRow(custRow) : '—'
                const phone = custRow?.phone?.trim() || null
                const veh = e.vehicle_id ? pipelineVehicleLabelFromRow(vehRow) : '—'
                const plate = vehRow?.license_plate?.trim() || null
                return (
                  <PipelineJobBoardCard
                    key={`q-est-${e.id}`}
                    detailHref={`/dashboard/estimates/${e.id}`}
                    shellStyle={{ ...advisorQueueCardShell, border: pipelineCardBorder.estimates }}
                    customerPhone={phone}
                    smsCustomerName={cust}
                    smsVehicleLine={veh}
                    shopName={ctx.tenant.name}
                    isEstimate
                  >
                    <AdvisorQueueStageLabel text="Needs customer approval" />
                    <PipelineJobCardHeader
                      customerLabel={cust}
                      customerPhone={phone}
                      docLabel={pipelineEstimateDoc(e)}
                    />
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: 'var(--text-2)',
                        lineHeight: 1.45,
                        marginBottom: 2,
                      }}
                    >
                      {veh}
                    </div>
                    {plate ? (
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-2)',
                          lineHeight: 1.35,
                          marginTop: 2,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {plate}
                      </div>
                    ) : null}
                    <div className={`pipeline-aging pipeline-aging--${aging.bucket}`}>{aging.line}</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                      <StatusBadge status={e.status} />
                    </div>
                  </PipelineJobBoardCard>
                )
              })}
              {inProgressWO.slice(0, 3).map(w => {
                const aging = activeWorkOrderPipelineAging(w.updated_at)
                const prog = pipelineWorkOrderProgressHint(w, 'active')
                const custRow = w.customer_id ? customerPipelineMap.get(w.customer_id) : undefined
                const vehRow = w.vehicle_id ? vehiclePipelineMap.get(w.vehicle_id) : undefined
                const cust = w.customer_id ? pipelineCustomerNameFromRow(custRow) : '—'
                const phone = custRow?.phone?.trim() || null
                const veh = w.vehicle_id ? pipelineVehicleLabelFromRow(vehRow) : '—'
                const plate = vehRow?.license_plate?.trim() || null
                return (
                  <PipelineJobBoardCard
                    key={`q-wo-${w.id}`}
                    detailHref={`/dashboard/work-orders/${w.id}`}
                    shellStyle={{ ...advisorQueueCardShell, border: pipelineCardBorder.workOrders }}
                    customerPhone={phone}
                    smsCustomerName={cust}
                    smsVehicleLine={veh}
                    shopName={ctx.tenant.name}
                  >
                    <AdvisorQueueStageLabel text="Active job needs attention" />
                    <PipelineJobCardHeader
                      customerLabel={cust}
                      customerPhone={phone}
                      docLabel={pipelineWorkOrderDoc(w)}
                      {...pipelineWoHeaderAssignmentProps(w)}
                    />
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: 'var(--text-2)',
                        lineHeight: 1.45,
                        marginBottom: 2,
                      }}
                    >
                      {veh}
                    </div>
                    {plate ? (
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-2)',
                          lineHeight: 1.35,
                          marginTop: 2,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {plate}
                      </div>
                    ) : null}
                    {prog ? (
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-2)',
                          marginTop: 4,
                          lineHeight: 1.35,
                        }}
                      >
                        {prog}
                      </div>
                    ) : null}
                    <div className={`pipeline-aging pipeline-aging--${aging.bucket}`}>{aging.line}</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                      <WorkOrderOperationalStatusPicker
                        workOrderId={w.id}
                        operationalStatus={w.operational_status ?? null}
                        lifecycleStatus={w.status}
                        canMutate={pipelineWorkOrderCanMutate(w)}
                      />
                    </div>
                  </PipelineJobBoardCard>
                )
              })}
              {completedWO.slice(0, 3).map(w => {
                const aging = completedWorkOrderPipelineAging(w.completed_at, w.updated_at)
                const prog = pipelineWorkOrderProgressHint(w, 'completed')
                const custRow = w.customer_id ? customerPipelineMap.get(w.customer_id) : undefined
                const vehRow = w.vehicle_id ? vehiclePipelineMap.get(w.vehicle_id) : undefined
                const cust = w.customer_id ? pipelineCustomerNameFromRow(custRow) : '—'
                const phone = custRow?.phone?.trim() || null
                const veh = w.vehicle_id ? pipelineVehicleLabelFromRow(vehRow) : '—'
                const plate = vehRow?.license_plate?.trim() || null
                return (
                  <PipelineJobBoardCard
                    key={`q-pu-${w.id}`}
                    detailHref={`/dashboard/work-orders/${w.id}`}
                    shellStyle={{ ...advisorQueueCardShell, border: pipelineCardBorder.completed }}
                    customerPhone={phone}
                    smsCustomerName={cust}
                    smsVehicleLine={veh}
                    shopName={ctx.tenant.name}
                    isReadyPickup
                  >
                    <AdvisorQueueStageLabel text="Ready — notify customer" />
                    <PipelineJobCardHeader
                      customerLabel={cust}
                      customerPhone={phone}
                      docLabel={pipelineWorkOrderDoc(w)}
                      {...pipelineWoHeaderAssignmentProps(w)}
                    />
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: 'var(--text-2)',
                        lineHeight: 1.45,
                        marginBottom: 2,
                      }}
                    >
                      {veh}
                    </div>
                    {plate ? (
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-2)',
                          lineHeight: 1.35,
                          marginTop: 2,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {plate}
                      </div>
                    ) : null}
                    {prog ? (
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-2)',
                          marginTop: 4,
                          lineHeight: 1.35,
                        }}
                      >
                        {prog}
                      </div>
                    ) : null}
                    <div className={`pipeline-aging pipeline-aging--${aging.bucket}`}>{aging.line}</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                      <WorkOrderOperationalStatusPicker
                        workOrderId={w.id}
                        operationalStatus={w.operational_status ?? null}
                        lifecycleStatus="completed"
                        lifecycleBadgeLabel="Ready for Pickup"
                        canMutate={pipelineWorkOrderCanMutate(w)}
                      />
                    </div>
                  </PipelineJobBoardCard>
                )
              })}
              {msgCount > 0 && (
                <Link
                  href="/dashboard/communications"
                  style={{
                    ...advisorQueueCardShell,
                    border: advisorQueueMessagesBorder,
                    background: 'linear-gradient(90deg, rgba(37, 99, 235, 0.06) 0%, var(--surface) 50%)',
                  }}
                >
                  <AdvisorQueueStageLabel text="Customer messages" />
                  <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.3, color: 'var(--text)', marginBottom: 4 }}>
                    {msgCount} this week
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', lineHeight: 1.45, marginBottom: 4 }}>
                    Review threads in communications
                  </div>
                  <div className="pipeline-aging pipeline-aging--fresh">Open messages →</div>
                </Link>
              )}
              {pendingInsp === 0 &&
                pipelineEstimates.length === 0 &&
                inProgressWO.length === 0 &&
                completedWO.length === 0 &&
                msgCount === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--text-2)', padding: '6px 0' }}>
                    Nothing queued here yet — you&apos;re caught up on these work types.
                  </div>
                )}
            </div>
          </div>
        )}

        {/* ── Secondary pulse ───────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 20 }}>
          {secondaryKpisDisplayed.map(k => (
            <Link key={k.label} href={k.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div
                style={{
                  ...inset,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  ...(k.accent === 'blue'
                    ? {
                        borderLeft: '3px solid #2563eb',
                        background: 'linear-gradient(90deg, rgba(37, 99, 235, 0.12) 0%, var(--surface-2) 45%)',
                      }
                    : {}),
                }}
              >
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>{k.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{k.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{k.hint}</div>
                </div>
                <span style={{ fontSize: 18, color: 'var(--text-3)' }}>→</span>
              </div>
            </Link>
          ))}
          {canViewFinancialOverview && billing && (
            <Link href="/dashboard/billing" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ ...inset, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Subscription</div>
                <div style={{ marginTop: 6 }}><StatusBadge status={billing.status} /></div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                  {billing.plan}{billing.monthly_amount ? ` · $${billing.monthly_amount}/mo` : ''}
                </div>
              </div>
            </Link>
          )}
        </div>

      </div>
    </>
  )
}
