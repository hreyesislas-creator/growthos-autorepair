'use client'

import { useState }    from 'react'
import Link            from 'next/link'
import { useRouter }   from 'next/navigation'
import type { WorkOrderWithItems, WorkOrderStatus } from '@/lib/types'
import {
  updateWorkOrderStatus,
  startWorkOrder,
  completeWorkOrder,
  reopenWorkOrder,
  cancelWorkOrder,
  createInvoiceFromWorkOrder,
  type WorkOrderTimeSnapshot,
} from './actions'
import ArchiveConfirmModal from '@/components/dashboard/ArchiveConfirmModal'
import type { ReasonOption } from '@/components/dashboard/ArchiveConfirmModal'

// ── Status badge styles ───────────────────────────────────────────────────────

// ── Cancel / archive reason options ──────────────────────────────────────────

const CANCEL_REASONS: ReasonOption[] = [
  { value: 'customer_cancelled', label: 'Customer cancelled'           },
  { value: 'created_in_error',   label: 'Created in error'             },
  { value: 'replaced_by_new',    label: 'Replaced by a new work order' },
  { value: 'duplicate',          label: 'Duplicate work order'         },
  { value: 'other',              label: 'Other (see note)'             },
]

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  draft:       { bg: '#e2e8f0', color: '#1e293b', label: 'Draft'       },
  ready:       { bg: '#dbeafe', color: '#1e40af', label: 'Ready'       },
  in_progress: { bg: '#fef9c3', color: '#854d0e', label: 'In Progress' },
  completed:   { bg: '#dcfce7', color: '#14532d', label: 'Completed'   },
  invoiced:    { bg: '#ede9fe', color: '#4c1d95', label: 'Invoiced'    },
}

function statusStyle(status: string) {
  return STATUS_STYLES[status] ?? { bg: '#f1f5f9', color: '#475569', label: status }
}

// ── Duration helper ───────────────────────────────────────────────────────────

function formatDuration(startedAt: string, completedAt: string): string {
  const ms      = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  if (ms <= 0) return '< 1 min'

  const totalMinutes = Math.floor(ms / 60_000)
  const hours        = Math.floor(totalMinutes / 60)
  const minutes      = totalMinutes % 60

  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

// ── Sub-component: Totals row ─────────────────────────────────────────────────

function TotalRow({ label, amount, bold }: { label: string; amount: number; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontWeight: bold ? 700 : 400 }}>
      <span style={{ fontSize: 13, color: bold ? 'var(--text)' : 'var(--text-2)' }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: bold ? 'var(--text)' : 'var(--text-2)' }}>
        ${amount.toFixed(2)}
      </span>
    </div>
  )
}

// ── Sub-component: Status action button ──────────────────────────────────────

interface ActionButtonProps {
  label:    string
  color:    string
  shadow:   string
  disabled: boolean
  onClick:  () => void
}

function ActionButton({ label, color, shadow, disabled, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        fontSize: 12, fontWeight: 700, padding: '8px 16px',
        borderRadius: 'var(--r8,8px)', border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        background: disabled ? color : `linear-gradient(135deg, ${color}, ${color}dd)`,
        color: '#fff', opacity: disabled ? 0.7 : 1,
        transition: 'all 0.15s', boxShadow: shadow,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  workOrder:    WorkOrderWithItems
  customerName: string | null
  vehicleLabel: string | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorkOrderDetail({ workOrder, customerName, vehicleLabel }: Props) {
  const router = useRouter()

  // ── Local state — optimistic mirrors of DB values ─────────────────────────
  const [status,      setStatus]      = useState<WorkOrderStatus>(workOrder.status as WorkOrderStatus)
  const [startedAt,   setStartedAt]   = useState<string | null>(workOrder.started_at   ?? null)
  const [completedAt, setCompletedAt] = useState<string | null>(workOrder.completed_at ?? null)
  const [actualHours, setActualHours] = useState<number | null>(workOrder.actual_hours  ?? null)
  const [updating,    setUpdating]    = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  // ── Cancel / archive modal state ──────────────────────────────────────────
  const [cancelOpen,    setCancelOpen]    = useState(false)
  const [cancelSubmit,  setCancelSubmit]  = useState(false)
  const [cancelError,   setCancelError]   = useState<string | null>(null)
  const [cancelTier,    setCancelTier]    = useState<'standard' | 'strong_warning' | 'hard_block'>('standard')
  const [cancelWarning, setCancelWarning] = useState('')

  // ── Invoice creation state ────────────────────────────────────────────────
  const [invoiceCreating, setInvoiceCreating] = useState(false)
  const [invoiceError,    setInvoiceError]    = useState<string | null>(null)
  const [invoiceResult,   setInvoiceResult]   = useState<{ id: string; invoice_number: string | null } | null>(
    workOrder.invoice_id ? { id: workOrder.invoice_id, invoice_number: null } : null
  )

  const s = statusStyle(status)

  // ── Generic transition wrapper ────────────────────────────────────────────
  // Captures all four time-tracking fields before the action, applies
  // optimistic values immediately, then corrects from the server snapshot on
  // success or rolls back all fields together on failure.

  const runTransition = async (
    action:               () => Promise<WorkOrderTimeSnapshot | void>,
    optimisticStatus:     WorkOrderStatus,
    optimisticStarted?:   string | null,
    optimisticCompleted?: string | null,
    optimisticHours?:     number | null,
  ) => {
    // Snapshot for rollback
    const prevStatus      = status
    const prevStartedAt   = startedAt
    const prevCompletedAt = completedAt
    const prevActualHours = actualHours

    setUpdating(true)
    setUpdateError(null)

    // Optimistic update
    setStatus(optimisticStatus)
    if (optimisticStarted   !== undefined) setStartedAt(optimisticStarted)
    if (optimisticCompleted !== undefined) setCompletedAt(optimisticCompleted)
    if (optimisticHours     !== undefined) setActualHours(optimisticHours)

    try {
      const result = await action()

      // Correct local state from the authoritative server snapshot
      if (result && typeof result === 'object') {
        setStatus(result.status)
        setStartedAt(result.started_at)
        setCompletedAt(result.completed_at)
        setActualHours(result.actual_hours)
      }

      router.refresh()
    } catch (err) {
      // Rollback all four fields to pre-action state
      setStatus(prevStatus)
      setStartedAt(prevStartedAt)
      setCompletedAt(prevCompletedAt)
      setActualHours(prevActualHours)
      const msg = err instanceof Error ? err.message : 'Failed to update status'
      setUpdateError(msg)
    } finally {
      setUpdating(false)
    }
  }

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleMarkReady = () =>
    runTransition(
      () => updateWorkOrderStatus(workOrder.id, 'ready'),
      'ready',
    )

  const handleStartWork = () =>
    runTransition(
      () => startWorkOrder(workOrder.id),
      'in_progress',
      new Date().toISOString(),   // optimistic: local now; server value replaces on success
      null,
    )

  const handleCompleteWork = () => {
    // Optimistic actual_hours: compute from local startedAt (server corrects on success)
    const nowMs             = Date.now()
    const optimisticCompleted = new Date(nowMs).toISOString()
    const optimisticHours     = startedAt
      ? Math.round(((nowMs - new Date(startedAt).getTime()) / 3_600_000) * 100) / 100
      : null

    return runTransition(
      () => completeWorkOrder(workOrder.id),
      'completed',
      undefined,            // startedAt unchanged
      optimisticCompleted,
      optimisticHours,
    )
  }

  const handleReopenWork = () =>
    runTransition(
      () => reopenWorkOrder(workOrder.id),
      'in_progress',
      undefined,   // startedAt preserved — unchanged
      null,        // completedAt → null
      null,        // actualHours → null
    )

  // ── Invoice handlers ──────────────────────────────────────────────────────

  const handleCreateInvoice = async () => {
    // If invoice already exists, navigate to it
    if (invoiceResult) {
      router.push(`/dashboard/invoices/${invoiceResult.id}`)
      return
    }

    setInvoiceCreating(true)
    setInvoiceError(null)

    try {
      const result = await createInvoiceFromWorkOrder(workOrder.id)
      setInvoiceResult({ id: result.id, invoice_number: result.invoice_number })
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create invoice'
      setInvoiceError(msg)
    } finally {
      setInvoiceCreating(false)
    }
  }

  // ── Cancel / archive handlers ─────────────────────────────────────────────

  function openCancelModal() {
    setCancelError(null)

    if (status === 'invoiced') {
      // Hard block — we know at open-time that invoiced WOs cannot be cancelled
      setCancelTier('hard_block')
      setCancelWarning(
        'This work order has been invoiced. ' +
        'Invoiced records cannot be cancelled or removed.',
      )
    } else if (status === 'in_progress' || status === 'completed') {
      // Strong warning — work was performed
      setCancelTier('strong_warning')
      setCancelWarning(
        'This work order has active or completed work recorded against it. ' +
        'Archiving will remove it from your active lists, but all time-tracking data will be preserved.',
      )
    } else {
      // Draft or ready — routine cancel
      setCancelTier('standard')
      setCancelWarning(
        'This work order will be removed from your active lists. ' +
        'It can still be viewed by an admin.',
      )
    }

    setCancelOpen(true)
  }

  async function handleCancelConfirm(reason: string, note: string) {
    setCancelSubmit(true)
    setCancelError(null)

    const result = await cancelWorkOrder(workOrder.id, reason, note || undefined)

    if (result === null) {
      setCancelOpen(false)
      router.push('/dashboard/work-orders')
    } else {
      setCancelError(result.error)
      setCancelSubmit(false)
    }
  }

  // ── Cancel button label (contextual on current status) ────────────────────
  const cancelButtonLabel =
    status === 'draft' || status === 'ready'
      ? 'Cancel Work Order'
      : 'Archive Work Order'

  // ── Derived totals ────────────────────────────────────────────────────────
  const subtotal      = Number(workOrder.subtotal)
  const taxAmount     = Number(workOrder.tax_amount)
  const total         = Number(workOrder.total)

  // ── Time tracking ─────────────────────────────────────────────────────────
  const showTimeCard = status === 'in_progress' || status === 'completed' || !!startedAt || !!completedAt
  // Live duration shown while in_progress (from optimistic startedAt).
  // Once completed, actual_hours is the authoritative stored value.
  const liveDuration = startedAt && completedAt ? formatDuration(startedAt, completedAt) : null

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="dash-content">

      {/* ── Header card ──────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>

          {/* Left: identity */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)',
              color: 'var(--text)', marginBottom: 6,
            }}>
              {workOrder.work_order_number ?? 'Work Order'}
            </div>

            {/* Status badge */}
            <span style={{
              display: 'inline-block', fontSize: 12, fontWeight: 700,
              padding: '4px 12px', borderRadius: 999,
              background: s.bg, color: s.color, marginBottom: 10,
            }}>
              {s.label}
            </span>

            {/* Customer / Vehicle / Estimate */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {customerName && (
                <div style={{ fontSize: 13, color: 'var(--text)' }}>
                  <span style={{ color: 'var(--text-3)', marginRight: 6, fontSize: 11 }}>Customer</span>
                  {customerName}
                </div>
              )}
              {vehicleLabel && (
                <div style={{ fontSize: 13, color: 'var(--text)' }}>
                  <span style={{ color: 'var(--text-3)', marginRight: 6, fontSize: 11 }}>Vehicle</span>
                  {vehicleLabel}
                </div>
              )}
              {workOrder.estimate_number && (
                <div style={{ fontSize: 13, color: 'var(--text)' }}>
                  <span style={{ color: 'var(--text-3)', marginRight: 6, fontSize: 11 }}>Source Estimate</span>
                  <Link
                    href={`/dashboard/estimates/${workOrder.estimate_id}`}
                    style={{ color: 'var(--primary,#2563eb)', fontFamily: 'var(--font-mono)', textDecoration: 'none' }}
                  >
                    {workOrder.estimate_number}
                  </Link>
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                Created {new Date(workOrder.created_at).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              </div>
            </div>
          </div>

          {/* Right: status action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>

            {status === 'draft' && (
              <ActionButton
                label={updating ? 'Updating…' : 'Mark as Ready →'}
                color="#2563eb"
                shadow="0 2px 8px rgba(37,99,235,0.3)"
                disabled={updating}
                onClick={handleMarkReady}
              />
            )}

            {status === 'ready' && (
              <ActionButton
                label={updating ? 'Starting…' : '▶ Start Work'}
                color="#16a34a"
                shadow="0 2px 8px rgba(22,163,74,0.3)"
                disabled={updating}
                onClick={handleStartWork}
              />
            )}

            {status === 'in_progress' && (
              <ActionButton
                label={updating ? 'Completing…' : '✓ Complete Work'}
                color="#d97706"
                shadow="0 2px 8px rgba(217,119,6,0.3)"
                disabled={updating}
                onClick={handleCompleteWork}
              />
            )}

            {status === 'completed' && (
              <ActionButton
                label={updating ? 'Reopening…' : '↩ Reopen Work Order'}
                color="#64748b"
                shadow="0 2px 8px rgba(100,116,139,0.25)"
                disabled={updating}
                onClick={handleReopenWork}
              />
            )}

            {updateError && (
              <span style={{ fontSize: 12, color: '#b91c1c', textAlign: 'right', maxWidth: 220 }}>
                ✕ {updateError}
              </span>
            )}

            {/* ── Create/View Invoice — shown when work order is completed ────── */}
            {status === 'completed' && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-2)' }}>
                <button
                  type="button"
                  disabled={invoiceCreating}
                  onClick={handleCreateInvoice}
                  title={
                    invoiceResult
                      ? 'View invoice'
                      : 'Create invoice from completed work'
                  }
                  style={{
                    fontSize: 12, fontWeight: 700, padding: '8px 14px',
                    borderRadius: 'var(--r8,8px)',
                    border: 'none',
                    cursor: (invoiceCreating) ? 'default' : 'pointer',
                    background: invoiceResult
                      ? '#1d4ed8'
                      : invoiceCreating
                      ? '#1d4ed8'
                      : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#fff',
                    opacity: invoiceCreating ? 0.7 : 1,
                    transition: 'all 0.15s',
                    boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                    whiteSpace: 'nowrap',
                    width: '100%',
                  }}
                >
                  {invoiceCreating
                    ? 'Creating…'
                    : invoiceResult
                    ? `📄 Invoice ↗`
                    : '📄 Create Invoice'}
                </button>
                {invoiceError && (
                  <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 6, textAlign: 'center' }}>
                    ✕ {invoiceError}
                  </div>
                )}
              </div>
            )}

            {/* ── Cancel / Archive — always shown, styled as secondary destructive */}
            <div style={{ marginTop: 4, borderTop: '1px solid var(--border-2)', paddingTop: 8 }}>
              <button
                type="button"
                className="btn-danger"
                style={{ fontSize: 11, padding: '4px 12px', width: '100%' }}
                onClick={openCancelModal}
                disabled={updating}
              >
                {cancelButtonLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Time tracking card ─────────────────────────────────────────────── */}
      {showTimeCard && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text-3)',
            paddingBottom: 10, borderBottom: '1px solid var(--border-2)',
            marginBottom: 12,
          }}>
            Time Tracking
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>

            {/* Started At */}
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Started At
              </div>
              <div style={{ fontSize: 13, color: startedAt ? 'var(--text)' : 'var(--text-3)' }}>
                {startedAt ? formatTimestamp(startedAt) : '—'}
              </div>
            </div>

            {/* Completed At */}
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Completed At
              </div>
              <div style={{ fontSize: 13, color: completedAt ? 'var(--text)' : 'var(--text-3)' }}>
                {completedAt ? formatTimestamp(completedAt) : '—'}
              </div>
            </div>

            {/* Actual Hours — authoritative stored value from DB */}
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Actual Hours
              </div>
              {actualHours != null ? (
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                  {actualHours.toFixed(2)} hrs
                </div>
              ) : liveDuration ? (
                // While in_progress and not yet completed, show live elapsed duration
                <div style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                  {liveDuration} <span style={{ fontSize: 11, color: 'var(--text-3)' }}>(elapsed)</span>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>—</div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── Line items (operational view) ────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: 'var(--text-3)',
          paddingBottom: 10, borderBottom: '1px solid var(--border-2)',
          marginBottom: 12,
        }}>
          Work Items ({workOrder.items.length})
        </div>

        {workOrder.items.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
            No items on this work order.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {workOrder.items.map(item => {
              const itemParts = (item as any).parts ?? []

              return (
                <div key={item.id} style={{
                  padding: 12,
                  borderRadius: 'var(--r6,6px)',
                  backgroundColor: 'var(--bg-2)',
                  border: '1px solid var(--border-2)',
                }}>
                  {/* Job title */}
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>
                    {item.title}
                  </div>

                  {/* Description */}
                  {item.description && (
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>
                      {item.description}
                    </div>
                  )}

                  {/* Labor estimate */}
                  {item.labor_hours != null && item.labor_rate != null && (
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
                      <span style={{ fontWeight: 500 }}>Estimated labor:</span> {Number(item.labor_hours).toFixed(1)} hr
                    </div>
                  )}

                  {/* Parts list */}
                  {itemParts.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 4 }}>
                        Parts needed:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {itemParts.map((part: any, idx: number) => (
                          <div key={idx} style={{ fontSize: 12, color: 'var(--text-2)', paddingLeft: 12 }}>
                            • {part.name} {part.quantity > 1 ? `(×${part.quantity})` : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Notes ────────────────────────────────────────────────────────── */}
      {(workOrder.notes || workOrder.internal_notes) && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text-3)',
            paddingBottom: 10, borderBottom: '1px solid var(--border-2)',
            marginBottom: 12,
          }}>
            Notes
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {workOrder.notes && (
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                  Customer-Facing Notes
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {workOrder.notes}
                </p>
              </div>
            )}
            {workOrder.internal_notes && (
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                  Internal Notes
                  <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-3)', marginLeft: 6 }}>
                    (shop only)
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {workOrder.internal_notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Footer nav ───────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <Link href="/dashboard/work-orders" className="btn-ghost" style={{ fontSize: 12 }}>
          ← Back to Work Orders
        </Link>
      </div>

      {/* ── Cancel / archive confirmation modal ──────────────────────────── */}
      <ArchiveConfirmModal
        isOpen={cancelOpen}
        onClose={() => { setCancelOpen(false); setCancelError(null) }}
        entityType="work order"
        entityLabel={workOrder.work_order_number ?? workOrder.id.slice(0, 8) + '…'}
        actionLabel={status === 'draft' || status === 'ready' ? 'Cancel' : 'Archive'}
        warningTier={cancelTier}
        warningText={cancelWarning}
        reasonOptions={CANCEL_REASONS}
        onConfirm={handleCancelConfirm}
        isSubmitting={cancelSubmit}
        errorMessage={cancelError}
      />

    </div>
  )
}
