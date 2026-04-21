import Link from 'next/link'
import { differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns'
import type { InspectionRow, WorkOrder } from '@/lib/types'
import type { ShopMessageFeedEntry } from '@/lib/queries'
import { getCustomerName, getVehicleDisplay } from '@/lib/queries'
import StatusBadge from '@/components/dashboard/StatusBadge'

export type TechnicianPerformanceSnapshot = {
  weekRevenue: number
  completedThisWeek: number
  averageTicket: number
}

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

type MyWorkRow = {
  key: string
  href: string
  kind: 'Work order' | 'Inspection'
  primary: string
  secondary: string
  status: string
  agingLine: string
  agingBucket: AgingBucket
  sortA: number
  sortB: string
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--text-3)',
  marginBottom: 12,
}

export default async function TechnicianOverview({
  workOrders,
  inspections,
  performance,
  shopMessages,
  missingTechnicianProfile,
}: {
  workOrders: WorkOrder[]
  inspections: InspectionRow[]
  performance: TechnicianPerformanceSnapshot
  shopMessages: ShopMessageFeedEntry[]
  missingTechnicianProfile: boolean
}) {
  /**
   * My work — v1 status rules (operator queue, not full history):
   * - Work orders: `draft`, `ready`, `in_progress` only (excludes `completed`, `invoiced`).
   * - Inspections: `draft`, `in_progress` only (excludes `completed`, `sent` — done / customer-facing).
   */
  const activeWo = workOrders.filter(
    w => w.status !== 'completed' && w.status !== 'invoiced',
  )
  const activeInsp = inspections.filter(
    i => i.status === 'draft' || i.status === 'in_progress',
  )

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

  const rows: MyWorkRow[] = []

  for (const w of activeWo) {
    const cust = w.customer_id ? customerNames.get(w.customer_id) ?? '—' : '—'
    const veh = w.vehicle_id ? vehicleLabels.get(w.vehicle_id) ?? '—' : '—'
    const days = calendarAgeDays(w.updated_at)
    const bucket = agingBucket(days)
    const suf = days <= 0 ? 'today' : days === 1 ? '1 day' : days < 5 ? `${days} days` : '5+ days'
    const agingLine = days <= 0 ? 'Updated today' : `Open · ${suf}`

    rows.push({
      key: `wo-${w.id}`,
      href: `/dashboard/work-orders/${w.id}`,
      kind: 'Work order',
      primary: cust,
      secondary: veh,
      status: w.status,
      agingLine,
      agingBucket: bucket,
      sortA: days,
      sortB: w.updated_at,
    })
  }

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
    const agingLine = days <= 0 ? 'Updated today' : `Inspect · ${suf}`

    rows.push({
      key: `insp-${i.id}`,
      href: `/dashboard/inspections/${i.id}`,
      kind: 'Inspection',
      primary: cust || '—',
      secondary: veh || '—',
      status: i.status,
      agingLine,
      agingBucket: bucket,
      sortA: days,
      sortB: i.updated_at,
    })
  }

  rows.sort((a, b) => {
    if (b.sortA !== a.sortA) return b.sortA - a.sortA
    return a.sortB.localeCompare(b.sortB)
  })

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

      <section style={{ marginBottom: 24 }}>
        <div style={sectionLabel}>My work</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
          Assigned jobs and inspections — oldest activity first.
        </div>
        {rows.length === 0 ? (
          <div
            className="card"
            style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}
          >
            Nothing assigned right now. Check back soon.
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
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--text-3)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {r.kind}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{r.primary}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
                        {r.secondary}
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className={`pipeline-aging pipeline-aging--${r.agingBucket}`} style={{ marginTop: 10 }}>
                    {r.agingLine}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

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
        <div style={sectionLabel}>Shop messages</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
          Shop-wide customer messaging is limited to service staff. Ask your advisor for customer
          updates or shop announcements.
        </div>
        {shopMessages.length === 0 ? (
          <div className="card" style={{ padding: 20, color: 'var(--text-3)' }}>
            No messages in your view.
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {shopMessages.map(m => (
                <li
                  key={m.id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-2)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{m.title}</div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-2)',
                      marginTop: 6,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {m.message}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-3)',
                      marginTop: 8,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {format(parseISO(m.created_at), 'MMM d, h:mm a')}
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
