import Link from 'next/link'
import { differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns'
import type { InspectionRow, ShopAnnouncement, WorkOrder } from '@/lib/types'
import { getCustomerName, getVehicleDisplay } from '@/lib/queries'
import StatusBadge from '@/components/dashboard/StatusBadge'

export type TechnicianPerformanceSnapshot = {
  weekRevenue: number
  completedThisWeek: number
  averageTicket: number
}

/** Actionable work orders only (operator queue). */
const ACTIONABLE_WORK_ORDER_STATUSES = new Set<string>(['ready', 'in_progress'])

/** Actionable inspections only (operator queue). */
const ACTIONABLE_INSPECTION_STATUSES = new Set<string>(['draft', 'in_progress'])

type AgingBucket = 'fresh' | 'recent' | 'stale' | 'urgent'

function calendarAgeDays(iso: string | null | undefined): number {
  if (!iso) return 0
  const d = parseISO(iso)
  if (Number.isNaN(d.getTime())) return 0
  return Math.max(0, differenceInCalendarDays(startOfDay(new Date()), startOfDay(d)))
}

function agingBucket(days: number): AgingBucket {
  if (days <= 0) return 'fresh'
  if (days <= 2) return 'recent'
  if (days <= 4) return 'stale'
  return 'urgent'
}

type QueueRow = {
  key: string
  href: string
  primary: string
  secondary: string
  meta?: string | null
  status: string
  agingLine: string
  agingBucket: AgingBucket
  sortA: number
  sortB: string
}

function sortOldestFirst(rows: QueueRow[]) {
  rows.sort((a, b) => {
    if (b.sortA !== a.sortA) return b.sortA - a.sortA
    return a.sortB.localeCompare(b.sortB)
  })
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--text-3)',
  marginBottom: 12,
}

function QueueSection({
  title,
  subtitle,
  rows,
  emptyText,
  accentColor,
}: {
  title: string
  subtitle: string
  rows: QueueRow[]
  emptyText: string
  accentColor: string
}) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={sectionLabel}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>{subtitle}</div>
      {rows.length === 0 ? (
        <div
          className="card"
          style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}
        >
          {emptyText}
        </div>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {rows.map(r => (
            <li key={r.key}>
              <Link
                href={r.href}
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  color: 'inherit',
                  padding: 14,
                  borderRadius: 10,
                  border: '1px solid var(--border-2)',
                  borderLeft: `4px solid ${accentColor}`,
                  background: 'var(--surface-2)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                      {r.primary}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
                      {r.secondary}
                    </div>
                    {r.meta ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-3)',
                          marginTop: 6,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {r.meta}
                      </div>
                    ) : null}
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div
                  className={`pipeline-aging pipeline-aging--${r.agingBucket}`}
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <span>{r.agingLine}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)' }}>
                    Open →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default async function TechnicianOverview({
  workOrders,
  inspections,
  performance,
  shopAnnouncements,
  missingTechnicianProfile,
}: {
  workOrders: WorkOrder[]
  inspections: InspectionRow[]
  performance: TechnicianPerformanceSnapshot
  shopAnnouncements: ShopAnnouncement[]
  missingTechnicianProfile: boolean
}) {
  const activeWo = workOrders.filter(w => ACTIONABLE_WORK_ORDER_STATUSES.has(w.status))
  const activeInsp = inspections.filter(i => ACTIONABLE_INSPECTION_STATUSES.has(i.status))

  const custIds = new Set<string>()
  const vehIds = new Set<string>()
  for (const w of activeWo) {
    if (w.customer_id) custIds.add(w.customer_id)
    if (w.vehicle_id) vehIds.add(w.vehicle_id)
  }
  for (const i of activeInsp) {
    if (i.customer_id) custIds.add(i.customer_id)
    if (i.vehicle_id) vehIds.add(i.vehicle_id)
  }

  const [custPairs, vehPairs] = await Promise.all([
    Promise.all([...custIds].map(async id => [id, await getCustomerName(id)] as const)),
    Promise.all([...vehIds].map(async id => [id, await getVehicleDisplay(id)] as const)),
  ])
  const customerNames = new Map(custPairs)
  const vehicleLabels = new Map(vehPairs)

  const jobRows: QueueRow[] = []
  for (const w of activeWo) {
    const cust = w.customer_id ? customerNames.get(w.customer_id) ?? '—' : '—'
    const veh = w.vehicle_id ? vehicleLabels.get(w.vehicle_id) ?? '—' : '—'
    const days = calendarAgeDays(w.updated_at)
    const bucket = agingBucket(days)
    const suf = days <= 0 ? 'today' : days === 1 ? '1 day' : days < 5 ? `${days} days` : '5+ days'
    const agingLine = days <= 0 ? 'Updated today' : `Waiting · ${suf}`

    jobRows.push({
      key: `wo-${w.id}`,
      href: `/dashboard/work-orders/${w.id}`,
      primary: cust,
      secondary: veh,
      meta: w.work_order_number?.trim() ? `WO ${w.work_order_number}` : null,
      status: w.status,
      agingLine,
      agingBucket: bucket,
      sortA: days,
      sortB: w.updated_at,
    })
  }
  sortOldestFirst(jobRows)

  const inspectionRows: QueueRow[] = []
  for (const i of activeInsp) {
    const cust = i.customer
      ? `${i.customer.first_name} ${i.customer.last_name ?? ''}`.trim()
      : i.customer_id
        ? customerNames.get(i.customer_id) ?? '—'
        : '—'
    const veh = i.vehicle
      ? [i.vehicle.year, i.vehicle.make, i.vehicle.model].filter(Boolean).join(' ')
      : i.vehicle_id
        ? vehicleLabels.get(i.vehicle_id) ?? '—'
        : '—'
    const days = calendarAgeDays(i.updated_at)
    const bucket = agingBucket(days)
    const suf = days <= 0 ? 'today' : days === 1 ? '1 day' : days < 5 ? `${days} days` : '5+ days'
    const agingLine = days <= 0 ? 'Updated today' : `Pending · ${suf}`

    inspectionRows.push({
      key: `insp-${i.id}`,
      href: `/dashboard/inspections/${i.id}`,
      primary: cust || '—',
      secondary: veh || '—',
      meta: null,
      status: i.status,
      agingLine,
      agingBucket: bucket,
      sortA: days,
      sortB: i.updated_at,
    })
  }
  sortOldestFirst(inspectionRows)

  const fmtMoney = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <>
      {missingTechnicianProfile && (
        <div
          className="card"
          style={{ marginBottom: 16, padding: 14, borderLeft: '4px solid #ca8a04' }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Setup needed</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
            Your account is not linked to a shop technician profile. Ask a service advisor to verify
            your team membership.
          </div>
        </div>
      )}

      <QueueSection
        title="My active jobs"
        subtitle="Work orders in ready or in progress — oldest first. Tap a row to open the job."
        rows={jobRows}
        emptyText="No active jobs assigned. When a job is ready or in progress under your name, it will show here."
        accentColor="#2563eb"
      />

      <QueueSection
        title="My pending inspections"
        subtitle="Inspections to finish — draft or in progress, oldest first."
        rows={inspectionRows}
        emptyText="No pending inspections assigned."
        accentColor="#ca8a04"
      />

      <section style={{ marginBottom: 24 }}>
        <div style={sectionLabel}>My performance</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
          }}
        >
          {[
            {
              label: 'This week revenue',
              value: fmtMoney(performance.weekRevenue),
              hint: 'Completed work orders',
            },
            { label: 'Jobs completed', value: performance.completedThisWeek, hint: 'This week' },
            {
              label: 'Average ticket',
              value: fmtMoney(performance.averageTicket),
              hint: 'Completed this week',
            },
          ].map(tile => (
            <div
              key={tile.label}
              className="card"
              style={{
                padding: 16,
                borderLeft: '4px solid #16a34a',
                background: 'linear-gradient(145deg, #f0fdf4 0%, var(--bg-2) 50%)',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--text-3)',
                  textTransform: 'uppercase',
                }}
              >
                {tile.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>{tile.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>{tile.hint}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <div style={sectionLabel}>Shop announcements</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
          Internal updates from your service team — not customer texts.
        </div>
        {shopAnnouncements.length === 0 ? (
          <div className="card" style={{ padding: 20, color: 'var(--text-3)' }}>
            No announcements yet. Your advisor will post shop updates here.
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {shopAnnouncements.map(a => (
                <li
                  key={a.id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-2)',
                    borderLeft: '3px solid #6366f1',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{a.title}</div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-2)',
                      marginTop: 6,
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.45,
                    }}
                  >
                    {a.message}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-3)',
                      marginTop: 8,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {format(parseISO(a.created_at), 'MMM d, yyyy · h:mm a')}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  )
}
