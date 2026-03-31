'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { EstimateWithItems, EstimateItem, EstimateItemPart, EstimateItemDecision } from '@/lib/types'
import FinalAuthorizationBlock from '@/components/estimates/FinalAuthorizationBlock'
import {
  sendEstimateByText,
  approveEstimateItem,
  declineEstimateItem,
  undecideEstimateItem,
  createWorkOrderFromApprovedItems,
  finalizeEstimateApproval,
} from './actions'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type JobDecision = 'approved' | 'declined' | null
export type DecisionMap = Record<string, JobDecision>

// ─────────────────────────────────────────────────────────────────────────────
// Work-Order architecture boundary
//
// When the Work Order module is built, import getApprovedItems here and call it
// with the current `decisions` map to get the approved line items to convert.
//
// Example (future Work Order page):
//   import { getApprovedItems } from '../present/PresentationView'
//   const approvedItems = getApprovedItems(estimate.items, decisions)
//   await createWorkOrder(tenantId, { estimateId: estimate.id, items: approvedItems })
// ─────────────────────────────────────────────────────────────────────────────

export function getApprovedItems(
  items: EstimateItem[],
  decisions: DecisionMap,
): EstimateItem[] {
  return items.filter(item => decisions[item.id] === 'approved')
}

// ─────────────────────────────────────────────────────────────────────────────
// Math helpers
// ─────────────────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Sum of all part line_totals on one item (sell price × qty, markup already applied). */
function getPartsSubtotal(item: EstimateItem): number {
  return (item.parts ?? []).reduce((sum, p) => sum + Number(p.line_total), 0)
}

/**
 * Job subtotal = labor_cost + parts_subtotal.
 * The DB's line_total is authoritative for saved items.
 */
function getJobSubtotal(item: EstimateItem): number {
  return Number(item.line_total)
}

/** Sum of parts-only subtotals across a list of items (used for proportional tax). */
function sumPartsAcrossItems(items: EstimateItem[]): number {
  return items.reduce((sum, i) => sum + getPartsSubtotal(i), 0)
}

/** Sum of job subtotals across a list of items. */
function sumJobSubtotals(items: EstimateItem[]): number {
  return items.reduce((sum, i) => sum + getJobSubtotal(i), 0)
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  estimate:          EstimateWithItems
  estimateId:        string          // used for Edit Estimate link + server actions
  customerName:      string | null
  vehicleLabel:      string | null
  shopName:          string
  customerPhone:     string | null   // used by Send by Text — null if no phone on file
  initialDecisions:  EstimateItemDecision[]  // pre-loaded from DB by page.tsx
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function PresentationView({
  estimate,
  estimateId,
  customerName,
  vehicleLabel,
  shopName,
  customerPhone,
  initialDecisions,
}: Props) {
  const router = useRouter()

  // ── Decisions — initialised from DB, then managed locally ─────────────────
  const [decisions, setDecisions] = useState<DecisionMap>(() => {
    const map: DecisionMap = {}
    for (const d of initialDecisions) {
      map[d.estimate_item_id] = d.decision   // 'approved' | 'declined'
    }
    return map
  })

  // itemIds currently being saved to the server (optimistic-update guard)
  const [saving,     setSaving]     = useState<Set<string>>(new Set())
  // per-item save error messages (cleared on next attempt for that item)
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({})

  // ── Work Order creation state ──────────────────────────────────────────────
  const [creatingWorkOrder, setCreatingWorkOrder] = useState(false)
  const [woError, setWoError] = useState<string | null>(null)

  // ── Final Authorization state ──────────────────────────────────────────────
  const [workOrderId, setWorkOrderId] = useState<string | undefined>(undefined)

  // ── Optimistic-update helpers ──────────────────────────────────────────────

  const approve = useCallback(async (id: string) => {
    // Snapshot before the optimistic update so we can restore on failure.
    // If the advisor was on 'declined' and flipped to 'approved', a server
    // error should roll back to 'declined', not to pending.
    const previous = decisions[id] ?? null

    setDecisions(prev => ({ ...prev, [id]: 'approved' }))
    setSaving(prev => new Set(prev).add(id))
    setSaveErrors(prev => { const n = { ...prev }; delete n[id]; return n })

    const err = await approveEstimateItem(estimateId, id)

    setSaving(prev => { const n = new Set(prev); n.delete(id); return n })
    if (err) {
      // Restore to previous state (null = pending, 'declined' = was declined)
      setDecisions(prev => {
        const n = { ...prev }
        if (previous === null) delete n[id]
        else n[id] = previous
        return n
      })
      setSaveErrors(prev => ({ ...prev, [id]: err.error }))
    }
  }, [estimateId, decisions])

  const decline = useCallback(async (id: string) => {
    // Same snapshot-and-restore pattern as approve.
    const previous = decisions[id] ?? null

    setDecisions(prev => ({ ...prev, [id]: 'declined' }))
    setSaving(prev => new Set(prev).add(id))
    setSaveErrors(prev => { const n = { ...prev }; delete n[id]; return n })

    const err = await declineEstimateItem(estimateId, id)

    setSaving(prev => { const n = new Set(prev); n.delete(id); return n })
    if (err) {
      setDecisions(prev => {
        const n = { ...prev }
        if (previous === null) delete n[id]
        else n[id] = previous
        return n
      })
      setSaveErrors(prev => ({ ...prev, [id]: err.error }))
    }
  }, [estimateId, decisions])

  const undecide = useCallback(async (id: string) => {
    const previous = decisions[id] ?? null   // snapshot — should be 'approved' or 'declined'

    setDecisions(prev => { const n = { ...prev }; delete n[id]; return n })
    setSaving(prev => new Set(prev).add(id))
    setSaveErrors(prev => { const n = { ...prev }; delete n[id]; return n })

    const err = await undecideEstimateItem(estimateId, id)

    setSaving(prev => { const n = new Set(prev); n.delete(id); return n })
    if (err) {
      // Restore to previous decision (approved or declined)
      if (previous !== null) setDecisions(prev => ({ ...prev, [id]: previous }))
      setSaveErrors(prev => ({ ...prev, [id]: err.error }))
    }
  }, [estimateId, decisions])

  // ── Create Work Order handler ──────────────────────────────────────────────
  const handleCreateWorkOrder = useCallback(async () => {
    setCreatingWorkOrder(true)
    setWoError(null)

    const result = await createWorkOrderFromApprovedItems(estimateId)

    if ('error' in result) {
      setWoError(result.error)
      setCreatingWorkOrder(false)
      return
    }

    // Success — redirect to the new work order page
    router.push(`/dashboard/work-orders/${result.data.workOrderId}`)
  }, [estimateId, router])

  // ── Final Authorization handler ────────────────────────────────────────────
  const handleAuthorizeEstimate = useCallback(async (approvedByName: string | null): Promise<string> => {
    const result = await finalizeEstimateApproval(estimateId, approvedByName)

    if ('error' in result) {
      throw new Error(result.error || 'Authorization failed')
    }

    const woId = result.data?.workOrderId
    if (woId) {
      setWorkOrderId(woId)
      return woId
    }

    throw new Error('No work order ID returned')
  }, [estimateId])

  const handleViewWorkOrder = useCallback((woId: string) => {
    router.push(`/dashboard/work-orders/${woId}`)
  }, [router])

  // ── Decision buckets ────────────────────────────────────────────────────────
  const approvedItems  = useMemo(() => estimate.items.filter(i => decisions[i.id] === 'approved'),  [estimate.items, decisions])
  const declinedItems  = useMemo(() => estimate.items.filter(i => decisions[i.id] === 'declined'),  [estimate.items, decisions])
  const remainingItems = useMemo(() => estimate.items.filter(i => !decisions[i.id]),                [estimate.items, decisions])

  // ── Subtotals per bucket (pre-tax) ─────────────────────────────────────────
  const approvedSubtotal  = useMemo(() => round2(sumJobSubtotals(approvedItems)),  [approvedItems])
  const declinedSubtotal  = useMemo(() => round2(sumJobSubtotals(declinedItems)),  [declinedItems])
  const remainingSubtotal = useMemo(() => round2(sumJobSubtotals(remainingItems)), [remainingItems])

  // ── Tax — proportional to approved parts only ───────────────────────────────
  // Tax applies to parts only (labor is never taxed).
  // We compute approved-parts tax proportionally from the stored tax_rate.
  const taxRateFraction  = estimate.tax_rate ?? 0
  const approvedPartsTax = useMemo(
    () => round2(sumPartsAcrossItems(approvedItems) * taxRateFraction),
    [approvedItems, taxRateFraction],
  )
  const fullEstimateTax = Number(estimate.tax_amount)

  // ── Approved total (with proportional tax) ─────────────────────────────────
  const approvedTotal = useMemo(
    () => round2(approvedSubtotal + approvedPartsTax),
    [approvedSubtotal, approvedPartsTax],
  )

  const allDecided = remainingItems.length === 0

  // ── Date display ────────────────────────────────────────────────────────────
  const estimateDate = new Date(estimate.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div style={{
      maxWidth: 780,
      margin: '0 auto',
      padding: '24px 16px 80px',
    }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#1e293b',
        border: '1px solid #475569',
        borderRadius: 10,
        padding: '20px 24px',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>
              {shopName}
            </div>
            <div style={{ fontSize: 13, color: '#cbd5e1' }}>
              Service Estimate · {estimate.estimate_number}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {customerName && (
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
                {customerName}
              </div>
            )}
            {vehicleLabel && (
              <div style={{ fontSize: 13, color: '#cbd5e1' }}>{vehicleLabel}</div>
            )}
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{estimateDate}</div>
          </div>
        </div>

        {/* ── Advisor action buttons ─────────────────────────────────────── */}
        <div style={{
          marginTop: 14,
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
        }}>
          <a
            href={`/dashboard/estimates/${estimateId}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 13,
              fontWeight: 600,
              padding: '7px 14px',
              borderRadius: 7,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#1e293b',
              textDecoration: 'none',
              transition: 'background 0.1s',
            }}
          >
            ✏️ Edit Estimate
          </a>
        </div>

        {estimate.notes && (
          <div style={{
            marginTop: 14,
            padding: '10px 14px',
            background: 'var(--surface-2,#f8fafc)',
            borderRadius: 6,
            fontSize: 13,
            color: '#374151',
            borderLeft: '3px solid #D1D5DB',
          }}>
            {estimate.notes}
          </div>
        )}
      </div>

      {/* ── Instruction banner ────────────────────────────────────────────── */}
      <div style={{
        background: '#0f2847',
        border: '1px solid #1e3a5f',
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 20,
        fontSize: 13,
        color: '#93c5fd',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>ℹ️</span>
        <span>
          Review each repair below and click <strong>Approve</strong> or <strong>Decline</strong> to build your work order.
          You can change your mind at any time before submitting.
        </span>
      </div>

      {/* ── Share bar ─────────────────────────────────────────────────────── */}
      <ShareBar
        estimateId={estimate.id}
        customerName={customerName}
        customerPhone={customerPhone}
        shopName={shopName}
      />

      {/* ── Job cards ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {estimate.items.map(item => (
          <JobCard
            key={item.id}
            item={item}
            decision={decisions[item.id] ?? null}
            onApprove={() => approve(item.id)}
            onDecline={() => decline(item.id)}
            onUndecide={() => undecide(item.id)}
            isSaving={saving.has(item.id)}
            saveError={saveErrors[item.id] ?? null}
          />
        ))}
      </div>

      {/* ── Totals summary ────────────────────────────────────────────────── */}
      <div style={{ marginTop: 28 }}>
        <TotalsSummary
          approvedSubtotal={approvedSubtotal}
          approvedPartsTax={approvedPartsTax}
          approvedTotal={approvedTotal}
          declinedSubtotal={declinedSubtotal}
          remainingSubtotal={remainingSubtotal}
          fullEstimateSubtotal={round2(Number(estimate.subtotal))}
          fullEstimateLaborSubtotal={round2(Number(estimate.subtotal_labor ?? 0))}
          fullEstimatePartsSubtotal={round2(Number(estimate.subtotal_parts ?? 0))}
          fullEstimateTax={fullEstimateTax}
          fullEstimateTotal={round2(Number(estimate.total))}
          taxRatePercent={taxRateFraction ? round2(taxRateFraction * 100) : null}
          allDecided={allDecided}
          approvedCount={approvedItems.length}
          totalCount={estimate.items.length}
        />
      </div>

      {/* ── Final Authorization Block ────────────────────────────────────── */}
      <FinalAuthorizationBlock
        approvedItemsCount={approvedItems.length}
        workOrderId={workOrderId}
        onAuthorize={handleAuthorizeEstimate}
        onViewWorkOrder={handleViewWorkOrder}
      />

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ShareBar
//
// Hydration-safe URL rendering rule:
//   The PUBLIC PATH (/e/[id]) is rendered as text — it is identical on the
//   server and the client, so there is ZERO hydration mismatch.
//
//   The FULL URL (https://…/e/[id]) is ONLY used inside event handlers and
//   the server action, never in JSX text.  window.location.origin is accessed
//   only at click time (always client-side), never during render.
// ─────────────────────────────────────────────────────────────────────────────

type CopyState  = 'idle' | 'copied'
type TextState  = 'idle' | 'sending' | 'sent' | 'no_phone' | 'not_wired' | 'error'

interface ShareBarProps {
  estimateId:    string
  customerName:  string | null
  customerPhone: string | null
  shopName:      string
}

function ShareBar({ estimateId, customerName, customerPhone, shopName }: ShareBarProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [textState, setTextState] = useState<TextState>('idle')
  const [textError, setTextError] = useState<string | null>(null)

  // ── Relative path — safe to render on server and client (no mismatch) ───────
  const publicPath = `/e/${estimateId}`

  // ── Copy Link ─────────────────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    // window.location.origin is only accessed here (event handler, always client)
    const fullUrl = window.location.origin + publicPath
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2500)
    }).catch(() => {
      // Fallback for non-HTTPS / permission denied
      const el = document.createElement('input')
      el.value = fullUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2500)
    })
  }, [publicPath])

  // ── Send by Text ──────────────────────────────────────────────────────────
  const handleSendText = useCallback(async () => {
    setTextState('sending')
    setTextError(null)
    const result = await sendEstimateByText(estimateId)

    if (result.noPhone)  { setTextState('no_phone');  return }
    if (result.error)    { setTextState('error'); setTextError(result.error); return }
    if (result.notWired) { setTextState('not_wired'); return }
    setTextState('sent')
    setTimeout(() => setTextState('idle'), 5000)
  }, [estimateId])

  return (
    <div style={{
      background: '#1e293b',
      border: '1px solid #475569',
      borderRadius: 10,
      padding: '14px 16px',
      marginBottom: 20,
    }}>
      {/* Row: label + buttons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 2 }}>
            Customer link
          </div>
          {/* ── Hydration-safe: relative path only — identical on server + client ── */}
          <div style={{
            fontSize: 12,
            color: '#94a3b8',
            fontFamily: 'var(--font-mono)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {publicPath}
          </div>
        </div>

        {/* Copy Link button */}
        <button
          onClick={handleCopy}
          style={{
            flexShrink: 0,
            padding: '8px 14px',
            borderRadius: 7,
            border: '1px solid #475569',
            background: copyState === 'copied' ? '#16a34a' : '#334155',
            color:  copyState === 'copied' ? '#fff' : '#cbd5e1',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          {copyState === 'copied' ? '✓ Copied!' : '📋 Copy Link'}
        </button>

        {/* Send by Text button */}
        <button
          onClick={handleSendText}
          disabled={textState === 'sending'}
          style={{
            flexShrink: 0,
            padding: '8px 14px',
            borderRadius: 7,
            border: '1px solid #475569',
            background: textState === 'sent' || textState === 'not_wired'
              ? '#16a34a'
              : textState === 'error' || textState === 'no_phone'
              ? '#7f1d1d'
              : '#334155',
            color: textState === 'sent' || textState === 'not_wired'
              ? '#fff'
              : textState === 'error' || textState === 'no_phone'
              ? '#fca5a5'
              : '#cbd5e1',
            fontSize: 13,
            fontWeight: 600,
            cursor: textState === 'sending' ? 'wait' : 'pointer',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          {textState === 'sending'   ? '⏳ Sending…'     :
           textState === 'sent'      ? '✓ Text Sent!'    :
           textState === 'not_wired' ? '✓ SMS (dev)'     :
           textState === 'no_phone'  ? '✕ No Phone'      :
           textState === 'error'     ? '✕ Failed'        :
                                       '💬 Send by Text'  }
        </button>
      </div>

      {/* Contextual feedback */}
      {textState === 'sent' && customerPhone && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#15803d' }}>
          Estimate link sent to {customerPhone}
        </div>
      )}
      {textState === 'not_wired' && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#92400e' }}>
          Dev mode — Twilio not configured. Message logged to console.
          Set <code style={{ fontSize: 11 }}>TWILIO_ACCOUNT_SID</code>, <code style={{ fontSize: 11 }}>TWILIO_AUTH_TOKEN</code>, <code style={{ fontSize: 11 }}>TWILIO_FROM_NUMBER</code> to enable live SMS.
        </div>
      )}
      {textState === 'no_phone' && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626' }}>
          No phone number on file for {customerName ?? 'this customer'}. Add one in the customer profile first.
        </div>
      )}
      {textState === 'error' && textError && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626' }}>
          {textError}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// JobCard
// ─────────────────────────────────────────────────────────────────────────────

interface JobCardProps {
  item:       EstimateItem
  decision:   JobDecision
  onApprove:  () => void
  onDecline:  () => void
  onUndecide: () => void
  isSaving:   boolean
  saveError:  string | null
}

function JobCard({ item, decision, onApprove, onDecline, onUndecide, isSaving, saveError }: JobCardProps) {
  const laborCost    = round2((item.labor_hours ?? 0) * (item.labor_rate ?? 0))
  const partsSubtotal = getPartsSubtotal(item)
  const jobSubtotal  = getJobSubtotal(item)
  const hasParts     = (item.parts ?? []).length > 0

  // ── Card visual state ──────────────────────────────────────────────────────
  const borderColor =
    decision === 'approved' ? '#16a34a' :
    decision === 'declined' ? '#dc2626' :
    'var(--border-2)'

  const bgColor =
    decision === 'approved' ? '#f0fdf4' :
    decision === 'declined' ? '#fff7f7' :
    '#fff'

  const opacity = decision === 'declined' ? 0.72 : 1

  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderLeft: `4px solid ${borderColor}`,
      borderRadius: 10,
      overflow: 'hidden',
      opacity,
      transition: 'all 0.15s ease',
    }}>

      {/* ── Card header ─────────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 18px 10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
              {item.title || 'Repair Job'}
            </span>
            {item.needs_review && (
              <span style={{
                fontSize: 10, fontWeight: 600, color: '#92400e',
                background: '#fffbeb', padding: '2px 6px', borderRadius: 3,
              }}>
                Needs Advisor Review
              </span>
            )}
          </div>
          {item.description && (
            <div style={{ fontSize: 13, color: '#374151', marginTop: 3 }}>
              {item.description}
            </div>
          )}
        </div>

        {/* Decision badge */}
        {decision && (
          <button
            onClick={onUndecide}
            disabled={isSaving}
            title={isSaving ? 'Saving…' : 'Click to undo decision'}
            style={{
              flexShrink: 0,
              padding: '4px 10px',
              borderRadius: 20,
              border: 'none',
              cursor: isSaving ? 'wait' : 'pointer',
              fontSize: 12,
              fontWeight: 700,
              opacity: isSaving ? 0.6 : 1,
              background: decision === 'approved' ? '#dcfce7' : '#fee2e2',
              color:      decision === 'approved' ? '#15803d' : '#dc2626',
            }}
          >
            {isSaving
              ? '…'
              : decision === 'approved' ? '✓ Approved' : '✗ Declined'}
            {!isSaving && (
              <span style={{ marginLeft: 4, opacity: 0.5, fontSize: 10 }}>undo</span>
            )}
          </button>
        )}
      </div>

      {/* ── Labor row ───────────────────────────────────────────────────── */}
      {(item.labor_hours ?? 0) > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 18px',
          borderTop: '1px solid #334155',
          background: '#0f172a',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>🔧</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
              Labor&nbsp;&nbsp;
              <span style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 400 }}>
                {item.labor_hours} hrs @ ${Number(item.labor_rate ?? 0).toFixed(2)}/hr
              </span>
            </span>
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)', fontWeight: 700,
            fontSize: 13, color: '#e2e8f0',
          }}>
            ${laborCost.toFixed(2)}
          </span>
        </div>
      )}

      {/* ── Parts list ──────────────────────────────────────────────────── */}
      {hasParts && (
        <PartsList parts={item.parts ?? []} partsSubtotal={partsSubtotal} />
      )}

      {/* ── Job total bar ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 18px',
        borderTop: '1px solid var(--border-2)',
        background: decision === 'approved'
          ? '#dcfce7'
          : decision === 'declined'
          ? '#fee2e2'
          : 'var(--surface-2,#f8fafc)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
          Job Total
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 15,
          fontWeight: 800,
          color: decision === 'approved' ? '#15803d' : '#111827',
        }}>
          ${jobSubtotal.toFixed(2)}
        </span>
      </div>

      {/* ── Approve / Decline buttons ────────────────────────────────────── */}
      {!decision && (
        <div style={{
          display: 'flex',
          gap: 10,
          padding: '12px 18px',
          borderTop: '1px solid var(--border-2)',
        }}>
          <button
            onClick={onApprove}
            disabled={isSaving}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 7,
              border: '2px solid #16a34a',
              background: '#fff',
              color: '#15803d',
              fontWeight: 700,
              fontSize: 14,
              cursor: isSaving ? 'wait' : 'pointer',
              opacity: isSaving ? 0.55 : 1,
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!isSaving) e.currentTarget.style.background = '#f0fdf4' }}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            {isSaving ? '…' : '✓ Approve'}
          </button>
          <button
            onClick={onDecline}
            disabled={isSaving}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 7,
              border: '2px solid #dc2626',
              background: '#fff',
              color: '#dc2626',
              fontWeight: 700,
              fontSize: 14,
              cursor: isSaving ? 'wait' : 'pointer',
              opacity: isSaving ? 0.55 : 1,
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!isSaving) e.currentTarget.style.background = '#fff7f7' }}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            {isSaving ? '…' : '✗ Decline'}
          </button>
        </div>
      )}

      {/* ── Save error ───────────────────────────────────────────────────── */}
      {saveError && (
        <div style={{
          padding: '8px 18px',
          borderTop: '1px solid var(--border-2)',
          background: 'var(--surface-2,#f8fafc)',
          fontSize: 12,
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{ flexShrink: 0 }}>⚠</span>
          <span>Could not save — {saveError}. Try again.</span>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PartsList
// ─────────────────────────────────────────────────────────────────────────────

function PartsList({
  parts,
  partsSubtotal,
}: {
  parts:         EstimateItemPart[]
  partsSubtotal: number
}) {
  return (
    <div style={{
      borderTop: '1px solid var(--border-2)',
      padding: '8px 18px 2px',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        Parts &amp; Materials
      </div>

      {parts.map(part => (
        <div key={part.id} style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: 5,
          gap: 8,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{part.name}</span>
            <span style={{
              fontSize: 11, color: '#6B7280',
              marginLeft: 6,
            }}>
              ×{part.quantity}
            </span>
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            fontWeight: 600,
            color: '#111827',
            flexShrink: 0,
          }}>
            ${Number(part.line_total).toFixed(2)}
          </span>
        </div>
      ))}

      {parts.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          paddingTop: 4,
          paddingBottom: 6,
          borderTop: '1px dashed var(--border-2)',
          marginTop: 2,
        }}>
          <span style={{ fontSize: 12, color: '#374151' }}>Parts subtotal</span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 700,
            color: '#111827',
          }}>
            ${partsSubtotal.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TotalsSummary
// ─────────────────────────────────────────────────────────────────────────────

interface TotalsSummaryProps {
  approvedSubtotal:       number
  approvedPartsTax:       number
  approvedTotal:          number
  declinedSubtotal:       number
  remainingSubtotal:      number
  fullEstimateSubtotal:   number
  fullEstimateLaborSubtotal?: number
  fullEstimatePartsSubtotal?: number
  fullEstimateTax:        number
  fullEstimateTotal:      number
  taxRatePercent:         number | null
  allDecided:             boolean
  approvedCount:          number
  totalCount:             number
}

function TotalsSummary({
  approvedSubtotal,
  approvedPartsTax,
  approvedTotal,
  declinedSubtotal,
  remainingSubtotal,
  fullEstimateSubtotal,
  fullEstimateLaborSubtotal,
  fullEstimatePartsSubtotal,
  fullEstimateTax,
  fullEstimateTotal,
  taxRatePercent,
  allDecided,
  approvedCount,
  totalCount,
}: TotalsSummaryProps) {
  return (
    <div style={{
      background: '#1e293b',
      border: '1px solid #475569',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 18px',
        borderBottom: '1px solid #475569',
        fontSize: 12,
        fontWeight: 700,
        color: '#e2e8f0',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        Summary — {approvedCount} of {totalCount} jobs decided
      </div>

      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Approved */}
        <SummaryRow
          label="Approved jobs"
          amount={approvedSubtotal}
          color="#15803d"
          bold={false}
        />

        {/* Declined */}
        <SummaryRow
          label="Declined jobs"
          amount={declinedSubtotal}
          color="#dc2626"
          muted={declinedSubtotal === 0}
          bold={false}
        />

        {/* Remaining */}
        {!allDecided && (
          <SummaryRow
            label="Awaiting decision"
            amount={remainingSubtotal}
            color="#6B7280"
            bold={false}
          />
        )}

        {/* Tax on approved */}
        {approvedPartsTax > 0 && (
          <SummaryRow
            label={`Tax on approved parts${taxRatePercent ? ` (${taxRatePercent}%)` : ''}`}
            amount={approvedPartsTax}
            color="#374151"
            bold={false}
            small
          />
        )}

        {/* Approved total */}
        <div style={{
          borderTop: '1px solid var(--border-2)',
          paddingTop: 10,
          marginTop: 2,
        }}>
          <SummaryRow
            label="Your approved total"
            amount={approvedTotal}
            color="#15803d"
            bold
          />
        </div>

        {/* Full estimate reference */}
        <div style={{
          marginTop: 6,
          padding: '10px 14px',
          background: 'var(--surface-2,#f8fafc)',
          borderRadius: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: '#374151',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 2,
          }}>
            Full estimate
          </div>
          <SummaryRow
            label="Jobs subtotal"
            amount={fullEstimateSubtotal}
            color="#374151"
            bold={false}
            small
          />
          {(fullEstimateLaborSubtotal ?? 0) > 0 && (
            <SummaryRow
              label="Labor"
              amount={fullEstimateLaborSubtotal}
              color="#6B7280"
              bold={false}
              small
            />
          )}
          {(fullEstimatePartsSubtotal ?? 0) > 0 && (
            <SummaryRow
              label="Parts & Materials"
              amount={fullEstimatePartsSubtotal}
              color="#6B7280"
              bold={false}
              small
            />
          )}
          {fullEstimateTax > 0 && (
            <SummaryRow
              label={`Tax${taxRatePercent ? ` (${taxRatePercent}% on parts)` : ''}`}
              amount={fullEstimateTax}
              color="#6B7280"
              bold={false}
              small
            />
          )}
          <SummaryRow
            label="Estimate total"
            amount={fullEstimateTotal}
            color="#ffffff"
            bold
          />
        </div>

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SummaryRow — reusable labeled amount row
// ─────────────────────────────────────────────────────────────────────────────

function SummaryRow({
  label,
  amount,
  color,
  bold  = false,
  muted = false,
  small = false,
}: {
  label:   string
  amount:  number
  color:   string
  bold?:   boolean
  muted?:  boolean
  small?:  boolean
}) {
  const opacity = muted ? 0.45 : 1
  const size    = small ? 12 : 13

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      opacity,
    }}>
      <span style={{ fontSize: size, color: '#cbd5e1', fontWeight: bold ? 700 : 400 }}>
        {label}
      </span>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize:   bold ? size + 1 : size,
        fontWeight: bold ? 800 : 500,
        color,
      }}>
        ${amount.toFixed(2)}
      </span>
    </div>
  )
}
