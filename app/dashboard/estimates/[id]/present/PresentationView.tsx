'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import type { EstimateWithItems, EstimateItem, EstimateItemPart } from '@/lib/types'
import { sendEstimateByText } from './actions'

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
  estimate:       EstimateWithItems
  customerName:   string | null
  vehicleLabel:   string | null
  shopName:       string
  customerPhone:  string | null   // used by Send by Text — null if no phone on file
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function PresentationView({
  estimate,
  customerName,
  vehicleLabel,
  shopName,
  customerPhone,
}: Props) {
  const [decisions, setDecisions] = useState<DecisionMap>({})

  const approve = (id: string) =>
    setDecisions(prev => ({ ...prev, [id]: 'approved' }))

  const decline = (id: string) =>
    setDecisions(prev => ({ ...prev, [id]: 'declined' }))

  const undecide = (id: string) =>
    setDecisions(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })

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
        background: '#fff',
        border: '1px solid var(--border-2)',
        borderRadius: 10,
        padding: '20px 24px',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
              {shopName}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
              Service Estimate · {estimate.estimate_number}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {customerName && (
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {customerName}
              </div>
            )}
            {vehicleLabel && (
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{vehicleLabel}</div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{estimateDate}</div>
          </div>
        </div>

        {estimate.notes && (
          <div style={{
            marginTop: 14,
            padding: '10px 14px',
            background: 'var(--surface-2,#f8fafc)',
            borderRadius: 6,
            fontSize: 13,
            color: 'var(--text-2)',
            borderLeft: '3px solid var(--border-2)',
          }}>
            {estimate.notes}
          </div>
        )}
      </div>

      {/* ── Instruction banner ────────────────────────────────────────────── */}
      <div style={{
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 20,
        fontSize: 13,
        color: '#1e40af',
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
          fullEstimateTax={fullEstimateTax}
          fullEstimateTotal={round2(Number(estimate.total))}
          taxRatePercent={taxRateFraction ? round2(taxRateFraction * 100) : null}
          allDecided={allDecided}
          approvedCount={approvedItems.length}
          totalCount={estimate.items.length}
        />
      </div>

      {/* ── Work-order CTA ────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 24,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        {!allDecided && (
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            {remainingItems.length} job{remainingItems.length !== 1 ? 's' : ''} still need a decision
          </span>
        )}
        <button
          disabled
          title="Work Order creation coming soon — approve jobs above first"
          style={{
            padding: '10px 22px',
            borderRadius: 8,
            border: 'none',
            background: allDecided && approvedItems.length > 0
              ? 'var(--accent,#2563eb)'
              : '#e2e8f0',
            color: allDecided && approvedItems.length > 0 ? '#fff' : '#94a3b8',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'not-allowed',
            opacity: allDecided && approvedItems.length > 0 ? 0.85 : 1,
          }}
        >
          Send Approved to Work Order
          <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, opacity: 0.75 }}>
            (coming soon)
          </span>
        </button>
      </div>

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
      background: '#fff',
      border: '1px solid var(--border-2)',
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
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 2 }}>
            Customer link
          </div>
          {/* ── Hydration-safe: relative path only — identical on server + client ── */}
          <div style={{
            fontSize: 12,
            color: 'var(--text-3)',
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
            border: '1px solid var(--border-2)',
            background: copyState === 'copied' ? '#f0fdf4' : '#fff',
            color:  copyState === 'copied' ? '#15803d' : 'var(--text-2)',
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
            border: '1px solid var(--border-2)',
            background: textState === 'sent' || textState === 'not_wired'
              ? '#f0fdf4'
              : textState === 'error' || textState === 'no_phone'
              ? '#fef2f2'
              : '#fff',
            color: textState === 'sent' || textState === 'not_wired'
              ? '#15803d'
              : textState === 'error' || textState === 'no_phone'
              ? '#dc2626'
              : 'var(--text-2)',
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
}

function JobCard({ item, decision, onApprove, onDecline, onUndecide }: JobCardProps) {
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
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
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
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>
              {item.description}
            </div>
          )}
        </div>

        {/* Decision badge */}
        {decision && (
          <button
            onClick={onUndecide}
            title="Click to undo decision"
            style={{
              flexShrink: 0,
              padding: '4px 10px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              background: decision === 'approved' ? '#dcfce7' : '#fee2e2',
              color:      decision === 'approved' ? '#15803d' : '#dc2626',
            }}
          >
            {decision === 'approved' ? '✓ Approved' : '✗ Declined'}
            <span style={{ marginLeft: 4, opacity: 0.5, fontSize: 10 }}>undo</span>
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
          borderTop: '1px solid var(--border-2)',
          background: 'var(--surface-2,#f8fafc)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>🔧</span>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
              Labor&nbsp;&nbsp;
              <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
                {item.labor_hours} hrs @ ${Number(item.labor_rate ?? 0).toFixed(2)}/hr
              </span>
            </span>
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)', fontWeight: 600,
            fontSize: 13, color: 'var(--text)',
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
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
          Job Total
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 15,
          fontWeight: 800,
          color: decision === 'approved' ? '#15803d' : 'var(--text)',
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
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 7,
              border: '2px solid #16a34a',
              background: '#fff',
              color: '#15803d',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            ✓ Approve
          </button>
          <button
            onClick={onDecline}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 7,
              border: '2px solid #dc2626',
              background: '#fff',
              color: '#dc2626',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fff7f7')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            ✗ Decline
          </button>
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
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
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
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{part.name}</span>
            <span style={{
              fontSize: 11, color: 'var(--text-3)',
              marginLeft: 6,
            }}>
              ×{part.quantity}
            </span>
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--text-2)',
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
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Parts subtotal</span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-2)',
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
  fullEstimateTax,
  fullEstimateTotal,
  taxRatePercent,
  allDecided,
  approvedCount,
  totalCount,
}: TotalsSummaryProps) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--border-2)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 18px',
        borderBottom: '1px solid var(--border-2)',
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--text-3)',
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
            color="var(--text-3)"
            bold={false}
          />
        )}

        {/* Tax on approved */}
        {approvedPartsTax > 0 && (
          <SummaryRow
            label={`Tax on approved parts${taxRatePercent ? ` (${taxRatePercent}%)` : ''}`}
            amount={approvedPartsTax}
            color="var(--text-2)"
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
            fontSize: 11, fontWeight: 600,
            color: 'var(--text-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 2,
          }}>
            Full estimate
          </div>
          <SummaryRow
            label="Jobs subtotal"
            amount={fullEstimateSubtotal}
            color="var(--text-2)"
            bold={false}
            small
          />
          {fullEstimateTax > 0 && (
            <SummaryRow
              label={`Tax${taxRatePercent ? ` (${taxRatePercent}% on parts)` : ''}`}
              amount={fullEstimateTax}
              color="var(--text-3)"
              bold={false}
              small
            />
          )}
          <SummaryRow
            label="Estimate total"
            amount={fullEstimateTotal}
            color="var(--text)"
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
      <span style={{ fontSize: size, color: 'var(--text-2)', fontWeight: bold ? 700 : 400 }}>
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
