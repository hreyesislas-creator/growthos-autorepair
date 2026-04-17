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
  getCustomerName,
  getVehicleDisplay,
  getCompletedWorkOrderCounts,
} from '@/lib/queries'
import { getFinancialDashboardData } from '@/lib/financial-queries'
import Topbar from '@/components/dashboard/Topbar'
import StatusBadge from '@/components/dashboard/StatusBadge'
import Link from 'next/link'
import { format } from 'date-fns'

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
    borderRadius: 10,
    border: '1px solid var(--border-2)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  }
  switch (accent) {
    case 'revenue':
      return {
        ...base,
        background: 'linear-gradient(145deg, #f0fdf4 0%, var(--bg-2) 55%)',
        boxShadow: '0 1px 0 rgba(22, 163, 74, 0.12)',
        borderLeft: '4px solid #16a34a',
      }
    case 'yellow':
      return {
        ...base,
        background: 'linear-gradient(145deg, #fefce8 0%, var(--bg-2) 55%)',
        boxShadow: '0 1px 0 rgba(234, 179, 8, 0.14)',
        borderLeft: '4px solid #ca8a04',
      }
    case 'blue':
      return {
        ...base,
        background: 'linear-gradient(145deg, #eff6ff 0%, var(--bg-2) 55%)',
        boxShadow: '0 1px 0 rgba(37, 99, 235, 0.08)',
        borderLeft: '4px solid #2563eb',
      }
    case 'green':
      return {
        ...base,
        background: 'linear-gradient(145deg, #f0fdf4 0%, var(--bg-2) 55%)',
        boxShadow: '0 1px 0 rgba(22, 163, 74, 0.12)',
        borderLeft: '4px solid #16a34a',
      }
    default:
      return { ...base, background: 'var(--bg-2)' }
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

/** Subtle tinted borders for pipeline item cards */
const pipelineCardBorder = {
  estimates: '1px solid rgba(234, 179, 8, 0.35)',
  workOrders: '1px solid rgba(59, 130, 246, 0.4)',
  completed: '1px solid rgba(34, 197, 94, 0.4)',
} as const

export default async function DashboardPage() {
  const ctx      = await getDashboardTenant()
  const tenantId = ctx?.tenant.id ?? ''
  const today    = format(new Date(), 'EEEE, MMM d')

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
  ])

  const pipelineEstimates = estimates
    .filter(e => PENDING_PIPELINE_ESTIMATE_STATUSES.has(e.status))
    .slice(0, PIPELINE_LIMIT)

  const inProgressWO = workOrders
    .filter(w => w.status === 'in_progress' || w.status === 'ready')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, PIPELINE_LIMIT)

  const completedWO = workOrders
    .filter(w => w.status === 'completed')
    .sort((a, b) =>
      (b.completed_at ?? b.updated_at).localeCompare(a.completed_at ?? a.updated_at),
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
  const [custPairs, vehPairs] = await Promise.all([
    Promise.all([...custIds].map(async id => [id, await getCustomerName(id)] as const)),
    Promise.all([...vehIds].map(async id => [id, await getVehicleDisplay(id)] as const)),
  ])
  const customerNames = new Map(custPairs)
  const vehicleLabels = new Map(vehPairs)

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

  const quickActions = [
    { label: 'New Appointment', icon: '\u{1F4C5}', href: '/dashboard/appointments' },
    { label: 'Add Customer', icon: '\u{1F464}', href: '/dashboard/customers' },
    { label: 'Add Vehicle', icon: '\u{1F697}', href: '/dashboard/vehicles' },
    { label: 'Inspection', icon: '\u{1F50D}', href: '/dashboard/inspections' },
    { label: 'Send Message', icon: '\u{1F4AC}', href: '/dashboard/communications' },
    { label: 'Edit Website', icon: '\u{1F310}', href: '/dashboard/website' },
  ]

  const inset: React.CSSProperties = {
    padding: '14px 16px',
    borderRadius: 10,
    border: '1px solid var(--border-2)',
    background: 'var(--bg-2)',
  }

  return (
    <>
      <Topbar title="Dashboard" subtitle={today} />
      <div className="dash-content">

        {/* ── Shop overview: cash + jobs (single KPI row) ────────────────── */}
        <div className="shop-today-section" style={{ marginBottom: 24 }}>
          <div style={{ ...sectionLabel, marginBottom: 8 }}>Shop overview</div>
          <div style={overviewKpiGridStyle}>
            {overviewAll.map(item => (
              <OverviewKpi key={item.label} {...item} />
            ))}
          </div>
          <div className="card shop-today-quick" style={{ marginTop: 16 }}>
            <div style={{ ...sectionLabel, marginBottom: 8 }}>Quick actions</div>
            <div className="quick-actions quick-actions--shop-today">
              {quickActions.map(a => (
                <Link key={a.label} href={a.href} className="quick-action-btn">
                  <div className="quick-action-icon">{a.icon}</div>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Operational pipeline (3 columns) ───────────────────────────── */}
        <div className="card" style={{ marginBottom: 24, padding: '18px 18px 16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={sectionLabel}>Shop pipeline</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: -4 }}>
                Estimates awaiting action, active work, and completed jobs
              </div>
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
            }}
          >
            {/* Column 1 — Estimates */}
            <div
              style={{
                borderRadius: 10,
                border: '1px solid rgba(234, 179, 8, 0.35)',
                background: 'linear-gradient(180deg, rgba(254, 252, 232, 0.35) 0%, var(--bg-2) 48%)',
                borderTop: '3px solid #ca8a04',
                padding: '12px 12px 10px',
                minWidth: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Estimates</div>
                <Link href="/dashboard/estimates" className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}>All</Link>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>Draft, presented, reopened</div>
              {pipelineEstimates.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '12px 0' }}>None in this stage.</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pipelineEstimates.map(e => (
                    <li key={e.id}>
                      <Link
                        href={`/dashboard/estimates/${e.id}`}
                        style={{
                          display: 'block',
                          textDecoration: 'none',
                          color: 'inherit',
                          padding: '10px 10px',
                          borderRadius: 8,
                          border: pipelineCardBorder.estimates,
                          background: 'var(--surface-2)',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          {e.customer_id ? (customerNames.get(e.customer_id) ?? '—') : '—'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.35 }}>
                          {e.vehicle_id ? (vehicleLabels.get(e.vehicle_id) ?? '—') : '—'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
                            {fmtMoney(e.total)}
                          </span>
                          <StatusBadge status={e.status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Column 2 — Work orders (active) */}
            <div
              style={{
                borderRadius: 10,
                border: '1px solid rgba(59, 130, 246, 0.35)',
                background: 'linear-gradient(180deg, rgba(239, 246, 255, 0.25) 0%, var(--bg-2) 48%)',
                borderTop: '3px solid #2563eb',
                padding: '12px 12px 10px',
                minWidth: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Work orders</div>
                <Link href="/dashboard/work-orders" className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}>All</Link>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>In progress or ready for work</div>
              {inProgressWO.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '12px 0' }}>Bay clear.</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {inProgressWO.map(w => (
                    <li key={w.id}>
                      <Link
                        href={`/dashboard/work-orders/${w.id}`}
                        style={{
                          display: 'block',
                          textDecoration: 'none',
                          color: 'inherit',
                          padding: '10px 10px',
                          borderRadius: 8,
                          border: pipelineCardBorder.workOrders,
                          background: 'var(--surface-2)',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          {w.customer_id ? (customerNames.get(w.customer_id) ?? '—') : '—'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.35 }}>
                          {w.vehicle_id ? (vehicleLabels.get(w.vehicle_id) ?? '—') : '—'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
                            {fmtMoney(w.total)}
                          </span>
                          <StatusBadge status={w.status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Column 3 — Completed / ready for pickup */}
            <div
              style={{
                borderRadius: 10,
                border: '1px solid rgba(34, 197, 94, 0.35)',
                background: 'linear-gradient(180deg, rgba(240, 253, 244, 0.22) 0%, var(--bg-2) 48%)',
                borderTop: '3px solid #16a34a',
                padding: '12px 12px 10px',
                minWidth: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Completed / ready</div>
                <Link href="/dashboard/work-orders" className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}>All</Link>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>Work complete — customer pickup</div>
              {completedWO.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '12px 0' }}>No completed jobs yet.</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {completedWO.map(w => (
                    <li key={w.id}>
                      <Link
                        href={`/dashboard/work-orders/${w.id}`}
                        style={{
                          display: 'block',
                          textDecoration: 'none',
                          color: 'inherit',
                          padding: '10px 10px',
                          borderRadius: 8,
                          border: pipelineCardBorder.completed,
                          background: 'var(--surface-2)',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          {w.customer_id ? (customerNames.get(w.customer_id) ?? '—') : '—'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.35 }}>
                          {w.vehicle_id ? (vehicleLabels.get(w.vehicle_id) ?? '—') : '—'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
                            {fmtMoney(w.total)}
                          </span>
                          <StatusBadge status="completed" label="Ready for Pickup" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ── Today&apos;s schedule ───────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="section-header">
              <div>
                <div className="section-title">Today&apos;s schedule</div>
                <div className="section-subtitle">{today}</div>
              </div>
              <Link href="/dashboard/appointments" className="btn-ghost">Calendar</Link>
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
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                          {a.appointment_time
                            ? format(new Date(`2000-01-01T${a.appointment_time}`), 'h:mm a')
                            : '—'}
                        </td>
                        <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                          {a.customer ? `${a.customer.first_name} ${a.customer.last_name}` : '—'}
                        </td>
                        <td><StatusBadge status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {todayAppts.length > 6 && (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '10px 0 0', textAlign: 'center' }}>
                    +{todayAppts.length - 6} more —{' '}
                    <Link href="/dashboard/appointments" style={{ color: '#2563eb', fontWeight: 600 }}>view all</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Secondary pulse ───────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 20 }}>
          {secondaryKpis.map(k => (
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
          {billing && (
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
