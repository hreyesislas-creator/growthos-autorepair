'use client'

import { format } from 'date-fns'
import type { Vehicle } from '@/lib/types'
import Link from 'next/link'
import { useMemo, type CSSProperties } from 'react'

type RelatedLink = { label: string; href: string }

type TimelineEntry = {
  id: string
  recordType: 'appointment' | 'inspection' | 'estimate' | 'work_order' | 'invoice'
  date: Date
  dateString: string
  status: string
  paymentStatus?: string
  title: string
  summary?: string
  workPerformed?: string
  detailUrl: string
  recordNumber?: string
  relatedLinks?: RelatedLink[]
  /** Same id = same job thread (adjacent rows in a month may show a shared band). */
  visitGroupId?: string
}

type VehicleIntelligenceSummary = {
  totalRevenue: number
  totalVisits: number
  invoiceCount: number
  averageTicket: number | null
  lastVisit: string | null
  recentWorkPerformed: string | null
}

type CurrentJobSnapshot = {
  stageLabel: string
  vehicleLabel: string
  lastActivityAt: string | null
  links: {
    inspection: { href: string; label: string } | null
    estimate: { href: string; label: string } | null
    workOrder: { href: string; label: string } | null
    invoice: { href: string; label: string } | null
  }
}

interface VehicleServiceHistoryProps {
  vehicle: Vehicle
  entries: TimelineEntry[]
  summary?: VehicleIntelligenceSummary
  currentJobSnapshot?: CurrentJobSnapshot
}

const recordTypeStyles: Record<TimelineEntry['recordType'], { bg: string; color: string; label: string }> = {
  appointment: { bg: '#e0f2fe', color: '#0369a1', label: 'Appointment' },
  inspection: { bg: '#fef3c7', color: '#b45309', label: 'Inspection' },
  estimate: { bg: '#ede9fe', color: '#5b21b6', label: 'Estimate' },
  work_order: { bg: '#dcfce7', color: '#14532d', label: 'Work order' },
  invoice: { bg: '#f1f5f9', color: '#334155', label: 'Invoice' },
}

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef9c3', text: '#854d0e' },
  confirmed: { bg: '#dbeafe', text: '#1e40af' },
  in_progress: { bg: '#fef9c3', text: '#854d0e' },
  completed: { bg: '#dcfce7', text: '#14532d' },
  cancelled: { bg: '#fee2e2', text: '#7f1d1d' },
  no_show: { bg: '#fee2e2', text: '#7f1d1d' },

  draft: { bg: '#e2e8f0', text: '#1e293b' },
  sent: { bg: '#dbeafe', text: '#1e40af' },

  presented: { bg: '#dbeafe', text: '#1e40af' },
  authorized: { bg: '#fef9c3', text: '#854d0e' },
  approved: { bg: '#dcfce7', text: '#14532d' },
  declined: { bg: '#fee2e2', text: '#7f1d1d' },
  reopened: { bg: '#fef9c3', text: '#854d0e' },

  ready: { bg: '#dbeafe', text: '#1e40af' },
  invoiced: { bg: '#ede9fe', text: '#4c1d95' },

  paid: { bg: '#dcfce7', text: '#14532d' },
  void: { bg: '#fee2e2', text: '#7f1d1d' },
  unpaid: { bg: '#fee2e2', text: '#991b1b' },
  partially_paid: { bg: '#fef3c7', text: '#92400e' },
}

function getStatusColor(status: string) {
  return statusColors[status] || { bg: '#e2e8f0', text: '#1e293b' }
}

/** Pill + row treatment for void invoices and declined estimates (noise reduction, same flat list). */
function getTypeStyleForEntry(entry: TimelineEntry) {
  if (entry.recordType === 'invoice' && entry.status === 'void') {
    return { bg: '#f1f5f9', color: '#64748b', label: 'Void invoice' }
  }
  if (entry.recordType === 'estimate' && entry.status === 'declined') {
    return { bg: '#f1f5f9', color: '#64748b', label: 'Declined estimate' }
  }
  return recordTypeStyles[entry.recordType]
}

function isDeemphasizedTimelineRow(entry: TimelineEntry) {
  return (
    (entry.recordType === 'invoice' && entry.status === 'void') ||
    (entry.recordType === 'estimate' && entry.status === 'declined')
  )
}

/** Operational order inside a job run (older → newer within the same step). */
const JOB_STEP_ORDER: Record<TimelineEntry['recordType'], number> = {
  appointment: 0,
  inspection: 1,
  estimate: 2,
  work_order: 3,
  invoice: 4,
}

type TimelineRun =
  | { kind: 'job'; visitGroupId: string; items: TimelineEntry[] }
  | { kind: 'plain'; items: TimelineEntry[] }

/** Consecutive rows with the same visitGroupId become one job run; ungrouped rows are plain. Single-row jobs render as plain. */
function splitMonthIntoRuns(monthItems: TimelineEntry[]): TimelineRun[] {
  const runs: TimelineRun[] = []
  let plainBuf: TimelineEntry[] = []

  const flushPlain = () => {
    if (plainBuf.length) {
      runs.push({ kind: 'plain', items: plainBuf })
      plainBuf = []
    }
  }

  for (const entry of monthItems) {
    if (!entry.visitGroupId) {
      plainBuf.push(entry)
      continue
    }
    const last = runs[runs.length - 1]
    if (last?.kind === 'job' && last.visitGroupId === entry.visitGroupId) {
      last.items.push(entry)
    } else {
      flushPlain()
      runs.push({ kind: 'job', visitGroupId: entry.visitGroupId, items: [entry] })
    }
  }
  flushPlain()

  return runs.flatMap(r => {
    if (r.kind === 'job' && r.items.length === 1) {
      return [{ kind: 'plain' as const, items: r.items }]
    }
    return [r]
  })
}

function sortJobRunItems(items: TimelineEntry[]): TimelineEntry[] {
  return [...items].sort((a, b) => {
    const oa = JOB_STEP_ORDER[a.recordType]
    const ob = JOB_STEP_ORDER[b.recordType]
    if (oa !== ob) return oa - ob
    return a.date.getTime() - b.date.getTime()
  })
}

type JobRunOutcome = 'paid' | 'payment_due' | 'not_invoiced' | 'neutral'

function isInvoicePaidEntry(e: TimelineEntry): boolean {
  return e.recordType === 'invoice' && (e.paymentStatus === 'paid' || e.status === 'paid')
}

function jobRunOutcome(sorted: TimelineEntry[]): JobRunOutcome {
  const nonVoidInvoices = sorted.filter(
    e => e.recordType === 'invoice' && e.status !== 'void',
  )
  const last = sorted[sorted.length - 1]

  if (last.recordType === 'invoice') {
    if (last.status === 'void') return nonVoidInvoices.length > 0 ? 'neutral' : 'payment_due'
    if (isInvoicePaidEntry(last)) return 'paid'
    return 'payment_due'
  }

  const wo = [...sorted].reverse().find(e => e.recordType === 'work_order')
  if (
    wo &&
    (wo.status === 'completed' || wo.status === 'invoiced') &&
    nonVoidInvoices.length === 0
  ) {
    return 'not_invoiced'
  }

  return 'neutral'
}

function jobRunHeaderDetail(sorted: TimelineEntry[]): string | null {
  const wo = sorted.find(e => e.recordType === 'work_order')
  if (wo?.recordNumber) return wo.recordNumber
  const inv = [...sorted].reverse().find(e => e.recordType === 'invoice' && e.status !== 'void')
  if (inv?.recordNumber) return inv.recordNumber
  return null
}

function jobBlockShellStyle(outcome: JobRunOutcome): CSSProperties {
  const base: CSSProperties = {
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 14,
    border: '1px solid',
  }
  switch (outcome) {
    case 'paid':
      return {
        ...base,
        borderColor: '#86efac',
        background: 'rgba(34, 197, 94, 0.07)',
        boxShadow: 'inset 0 0 0 1px rgba(34, 197, 94, 0.12)',
      }
    case 'payment_due':
      return {
        ...base,
        borderColor: '#f59e0b',
        background: 'rgba(245, 158, 11, 0.08)',
        boxShadow: 'inset 0 0 0 1px rgba(245, 158, 11, 0.14)',
      }
    case 'not_invoiced':
      return {
        ...base,
        borderColor: '#93c5fd',
        background: 'rgba(59, 130, 246, 0.07)',
        boxShadow: 'inset 0 0 0 1px rgba(59, 130, 246, 0.12)',
      }
    default:
      return {
        ...base,
        borderColor: 'var(--border)',
        background: 'var(--bg-2, #f8fafc)',
      }
  }
}

function outcomeBadge(outcome: JobRunOutcome): string | null {
  if (outcome === 'paid') return 'Paid'
  if (outcome === 'payment_due') return 'Payment due'
  if (outcome === 'not_invoiced') return 'Not invoiced'
  return null
}

function renderTimelineEntryRow(entry: TimelineEntry, borderBottom: string) {
  const statusColor = getStatusColor(entry.status)
  const typeStyle = getTypeStyleForEntry(entry)
  const deemphasized = isDeemphasizedTimelineRow(entry)
  const recordDate = formatRecordDate(entry)
  const recordTime = formatRecordTime(entry)
  const timeDisplay = recordTime ? ` · ${recordTime}` : ''
  const payColor = entry.paymentStatus ? getStatusColor(entry.paymentStatus) : null

  return (
    <div
      key={entry.id}
      style={{
        padding: '14px 0',
        borderBottom,
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
        opacity: deemphasized ? 0.72 : 1,
      }}
    >
      <div style={{
        flex: '0 0 108px',
        fontSize: 12,
        color: 'var(--text-3)',
        fontFamily: 'var(--font-mono)',
      }}>
        {recordDate}
        {timeDisplay && (
          <div style={{ fontSize: 11, marginTop: 2, opacity: 0.9 }}>{recordTime}</div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 4,
            background: typeStyle.bg,
            color: typeStyle.color,
          }}>
            {typeStyle.label}
          </span>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {entry.title}
          </div>
          <span style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 4,
            background: statusColor.bg,
            color: statusColor.text,
            textTransform: 'capitalize',
          }}>
            {entry.status.replace(/_/g, ' ')}
          </span>
          {entry.recordType === 'invoice' && entry.paymentStatus && payColor && (
            <span style={{
              display: 'inline-block',
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 4,
              background: payColor.bg,
              color: payColor.text,
              textTransform: 'capitalize',
            }}>
              {entry.paymentStatus.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {entry.summary && (
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 6 }}>
            {entry.summary}
          </div>
        )}
        {entry.workPerformed && (
          <div style={{
            fontSize: 12,
            color: 'var(--text)',
            marginBottom: 8,
            lineHeight: 1.45,
            padding: '8px 10px',
            background: 'var(--bg-2, #f8fafc)',
            borderRadius: 6,
            border: '1px solid var(--border-2, #e2e8f0)',
          }}>
            <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>Work performed: </span>
            {entry.workPerformed}
          </div>
        )}

        {entry.relatedLinks && entry.relatedLinks.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
            marginBottom: 8,
            fontSize: 12,
          }}>
            <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>Related:</span>
            {entry.relatedLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  color: '#2563eb',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <Link
          href={entry.detailUrl}
          style={{
            fontSize: 12,
            color: '#16a34a',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          {entry.recordType === 'appointment' ? 'Open appointment →' : 'Open record →'}
        </Link>
      </div>
    </div>
  )
}

function formatRecordDate(entry: TimelineEntry): string {
  try {
    return format(entry.date, 'MMM d, yyyy')
  } catch {
    return 'Unknown date'
  }
}

function formatRecordTime(entry: TimelineEntry): string | null {
  if (entry.recordType === 'appointment') {
    try {
      return format(entry.date, 'h:mm a')
    } catch {
      return null
    }
  }
  return null
}

function groupEntriesByMonth(entries: TimelineEntry[]) {
  const groups: { label: string; items: TimelineEntry[] }[] = []
  for (const entry of entries) {
    const label = format(entry.date, 'MMMM yyyy')
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(entry)
    else groups.push({ label, items: [entry] })
  }
  return groups
}

export default function VehicleServiceHistory({
  vehicle,
  entries,
  summary,
  currentJobSnapshot,
}: VehicleServiceHistoryProps) {
  const vehicleLabel = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle'
  const mileage = vehicle.mileage ? `${vehicle.mileage.toLocaleString()} mi` : null
  const monthGroups = useMemo(() => groupEntriesByMonth(entries), [entries])

  return (
    <div className="dash-content">
      {/* Vehicle header */}
      <div style={{
        marginBottom: 32,
        padding: '16px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r8)',
      }}>
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {vehicleLabel}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--text-3)', flexWrap: 'wrap' }}>
          {vehicle.vin && (
            <div>
              <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>VIN:</span>
              {' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>{vehicle.vin.slice(-8)}</span>
            </div>
          )}
          {vehicle.license_plate && (
            <div>
              <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>Plate:</span>
              {' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>{vehicle.license_plate}</span>
            </div>
          )}
          {mileage && (
            <div>
              <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>Mileage:</span>
              {' '}
              {mileage}
            </div>
          )}
        </div>
      </div>

      {/* Current Job Snapshot */}
      {currentJobSnapshot && (
        <div style={{
          marginBottom: 32,
          padding: '16px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r8)',
        }}>
          <h3 style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--text-3)',
            margin: '0 0 8px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            Current job
          </h3>
          <div style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: 10,
            lineHeight: 1.25,
          }}>
            {currentJobSnapshot.stageLabel}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.5 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{currentJobSnapshot.vehicleLabel}</span>
            {currentJobSnapshot.lastActivityAt && (
              <>
                {' · '}
                Last activity{' '}
                {format(new Date(currentJobSnapshot.lastActivityAt), 'MMM d, yyyy')}
              </>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
            {([
              currentJobSnapshot.links.inspection,
              currentJobSnapshot.links.estimate,
              currentJobSnapshot.links.workOrder,
              currentJobSnapshot.links.invoice,
            ].filter(Boolean) as { href: string; label: string }[]).map(link => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#2563eb',
                  textDecoration: 'none',
                }}
              >
                {link.label} →
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Vehicle Intelligence Summary */}
      {summary && (
        <div style={{
          marginBottom: 32,
          padding: '16px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r8)',
        }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: 6,
            marginTop: 0,
            letterSpacing: '0.02em',
          }}>
            Vehicle Summary
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 16px' }}>
            Total invoiced sums non-void invoices. Visits count work orders marked completed or invoiced.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
          }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Total revenue</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                {summary.totalRevenue > 0 ? `$${summary.totalRevenue.toFixed(2)}` : '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                {summary.invoiceCount > 0 ? `${summary.invoiceCount} invoice${summary.invoiceCount !== 1 ? 's' : ''}` : 'No invoices yet'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Shop visits</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                {summary.totalVisits}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Work orders</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Average ticket</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                {summary.averageTicket !== null ? `$${summary.averageTicket.toFixed(2)}` : '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                {summary.averageTicket !== null ? 'Per invoice (total ÷ invoice count)' : 'No invoices yet'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Last Visit</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                {summary.lastVisit ? format(new Date(summary.lastVisit), 'MMM d, yyyy') : '—'}
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Latest Work</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.45 }}>
                {summary.recentWorkPerformed ?? '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service History Timeline */}
      <div style={{
        padding: '16px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r8)',
      }}>
        <h3 style={{
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: 6,
          marginTop: 0,
          letterSpacing: '0.02em',
        }}>
          Service Timeline
        </h3>
        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 16px' }}>
          Track each visit from inspection → work order → invoice
        </p>

        {entries.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '32px 16px',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }} aria-hidden>—</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
              No service timeline yet
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 360, margin: '0 auto' }}>
              Appointments, inspections, estimates, work orders, and invoices for this vehicle will show here in one timeline.
            </div>
          </div>
        ) : (
          <div>
            {monthGroups.map(group => (
              <div key={group.label} style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--text-2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border)',
                  marginBottom: 4,
                }}>
                  {group.label}
                </div>
                <div style={{ borderTop: '1px solid transparent' }}>
                  {splitMonthIntoRuns(group.items).map((run, runIdx, allRuns) => {
                    const isLastRun = runIdx === allRuns.length - 1
                    if (run.kind === 'plain') {
                      return (
                        <div key={`plain-${group.label}-${runIdx}`}>
                          {run.items.map((entry, idx) => {
                            const isLastInPlain = idx === run.items.length - 1
                            const borderBottom =
                              !isLastInPlain || !isLastRun ? '1px solid var(--border)' : 'none'
                            return renderTimelineEntryRow(entry, borderBottom)
                          })}
                        </div>
                      )
                    }

                    const sorted = sortJobRunItems(run.items)
                    const outcome = jobRunOutcome(sorted)
                    const detail = jobRunHeaderDetail(sorted)
                    const badge = outcomeBadge(outcome)
                    const badgeColor =
                      outcome === 'paid'
                        ? '#15803d'
                        : outcome === 'payment_due'
                          ? '#b45309'
                          : outcome === 'not_invoiced'
                            ? '#1d4ed8'
                            : 'var(--text-3)'

                    return (
                      <div
                        key={`job-${group.label}-${run.visitGroupId}-${runIdx}`}
                        style={jobBlockShellStyle(outcome)}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          marginBottom: 6,
                          flexWrap: 'wrap',
                        }}>
                          <div style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--text-2)',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                          }}>
                            Repair job{detail ? ` · ${detail}` : ''}
                          </div>
                          {badge && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                              color: badgeColor,
                            }}>
                              {badge}
                            </span>
                          )}
                        </div>
                        {sorted.map((entry, idx) => {
                          const isLast = idx === sorted.length - 1
                          const borderBottom = isLast
                            ? 'none'
                            : '1px dashed rgba(148, 163, 184, 0.55)'
                          return renderTimelineEntryRow(entry, borderBottom)
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
