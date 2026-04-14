'use client'

import { useState, useMemo, useCallback } from 'react'
import type { EstimateWithItems, EstimateItem, EstimateItemPart, EstimateItemDecision } from '@/lib/types'
import FinalAuthorizationBlock from '@/components/estimates/FinalAuthorizationBlock'
import {
  approveEstimateItem,
  declineEstimateItem,
  undecideEstimateItem,
  finalizeEstimateApproval,
} from './actions'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type JobDecision = 'approved' | 'declined' | null
export type DecisionMap = Record<string, JobDecision>

// Matches the shape selected from service_recommendations in page.tsx.
// Only includes columns confirmed to exist in the live schema.
interface Recommendation {
  id:              string
  title:           string
  description:     string | null
  item_name:       string | null
  priority:        string | null
  status:          string | null   // 'attention' | 'urgent' | 'pass' etc.
  estimated_price: number | null
}

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
  estimate:            EstimateWithItems
  estimateId:          string          // used for Edit Estimate link + server actions
  customerName:        string | null
  vehicleLabel:        string | null
  shopName:            string
  customerPhone:       string | null   // used by Send by Text — null if no phone on file
  initialDecisions:    EstimateItemDecision[]  // pre-loaded from DB by page.tsx
  existingWorkOrderId?: string          // loaded from work_orders table in page.tsx
  profile?:            any             // business_profiles data (address, contact, warranty, footer)
  isLocked?:           boolean         // true if authorization already completed and work order exists
  recommendations?:    Recommendation[] // inspection findings — display only, no effect on approval logic
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
  existingWorkOrderId,
  profile,
  isLocked,
  recommendations = [],
}: Props) {
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

  // ── Work Order Authorization ───────────────────────────────────────────────
  // Initialize from existingWorkOrderId (loaded from DB in page.tsx)
  const [workOrderId, setWorkOrderId] = useState<string | undefined>(existingWorkOrderId)

  // ── Optimistic-update helpers ──────────────────────────────────────────────

  const approve = useCallback(async (id: string) => {
    // Snapshot before the optimistic update so we can restore on failure.
    // If the customer was on 'declined' and flipped to 'approved', a server
    // error should roll back to 'declined', not to pending.
    const previous = decisions[id] ?? null

    setDecisions(prev => ({ ...prev, [id]: 'approved' }))
    setSaving(prev => new Set(prev).add(id))
    setSaveErrors(prev => { const n = { ...prev }; delete n[id]; return n })

    const err = await approveEstimateItem(estimateId, id)

    setSaving(prev => { const n = new Set(prev); n.delete(id); return n })
    if (err) {
      // Restore to previous state (null = pending, 'declined' = was declined)
      console.error('[PresentationView] approval failed, restoring state:', { itemId: id, errorMsg: err.error })
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
      // Restore to previous state
      console.error('[PresentationView] decline failed, restoring state:', { itemId: id, errorMsg: err.error })
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

  // ── Work Order Authorization handler ────────────────────────────────────────
  const handleAuthorizeEstimate = useCallback(async (approvedByName: string | null): Promise<string> => {
    const result = await finalizeEstimateApproval(estimateId, approvedByName)

    if ('error' in result && result.error) {
      throw new Error(result.error)
    }

    // Phase 1: Check for authorized flag (may or may not have workOrderId)
    const authorized = result.data?.authorized
    if (!authorized) {
      throw new Error('Authorization failed')
    }

    // If a work order was created, update state; otherwise return empty string
    const woId = result.data?.workOrderId
    if (woId) {
      setWorkOrderId(woId)
      return woId
    }

    // Phase 1: Authorization succeeded without work order (will be created internally)
    return ''
  }, [estimateId])

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
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
              {shopName}
            </div>
            {/* Address block */}
            {(profile?.address_line_1 || profile?.city || profile?.state) && (
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8, lineHeight: '1.3' }}>
                {profile?.address_line_1 && <div>{profile.address_line_1}</div>}
                {profile?.address_line_2 && <div>{profile.address_line_2}</div>}
                {(profile?.city || profile?.state || profile?.zip_code) && (
                  <div>
                    {[profile?.city, profile?.state, profile?.zip_code]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                )}
              </div>
            )}
            {/* Contact info */}
            {(profile?.phone || profile?.email || profile?.website) && (
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8, lineHeight: '1.3' }}>
                {profile?.phone && <div>📞 {profile.phone}</div>}
                {profile?.email && <div>📧 {profile.email}</div>}
                {profile?.website && <div>🌐 {profile.website}</div>}
              </div>
            )}
            <div style={{ fontSize: 13, color: '#4B5563' }}>
              Service Estimate · {estimate.estimate_number}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {customerName && (
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                {customerName}
              </div>
            )}
            {vehicleLabel && (
              <div style={{ fontSize: 13, color: '#4B5563' }}>{vehicleLabel}</div>
            )}
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{estimateDate}</div>
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
            href={`/e/${estimateId}/print`}
            target="_blank"
            rel="noopener noreferrer"
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
            🖨️ Print Estimate
          </a>
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

      {/* ── Status banners ────────────────────────────────────────────────── */}
      {estimate.status === 'reopened' ? (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fbbf24',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 20,
          fontSize: 13,
          color: '#92400e',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span>
            <strong>Re-authorization Needed</strong> — Please review and confirm your approved repairs again.
            You can change your selections before submitting.
          </span>
        </div>
      ) : isLocked && workOrderId ? (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 20,
          fontSize: 13,
          color: '#15803d',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <span>
            <strong>Authorization Complete</strong> — Your work order has been created.
            Decisions cannot be changed at this time.
          </span>
        </div>
      ) : isLocked && !workOrderId ? (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 20,
          fontSize: 13,
          color: '#15803d',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <span>
            <strong>Authorization Submitted</strong> — Thank you. The shop will create your work order and contact you.
            Decisions cannot be changed at this time.
          </span>
        </div>
      ) : (
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
      )}

      {/* ── Inspection Findings (informational only — no effect on approval) ── */}
      {recommendations.length > 0 && (
        <div style={{
          background: '#fff',
          border: '1px solid var(--border-2)',
          borderRadius: 10,
          padding: '20px 24px',
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
            🔍 Inspection Findings
          </div>
          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.55, margin: '0 0 16px' }}>
            Based on the completed vehicle inspection, your technician found the following items.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recommendations
              .slice()
              .sort((a, b) => {
                // urgent first, then attention, then rest
                const rank = (r: Recommendation) =>
                  r.status === 'urgent' || r.priority === 'high' || r.priority === 'urgent' ? 0
                  : r.status === 'attention' || r.priority === 'medium' ? 1
                  : 2
                return rank(a) - rank(b)
              })
              .map(rec => <InspectionFindingCard key={rec.id} rec={rec} />)
            }
          </div>
        </div>
      )}

      {/* ── STEP 1: Customer-facing intro card ───────────────────────────── */}
      <div style={{
        background: '#fff',
        border: '1px solid var(--border-2)',
        borderRadius: 10,
        padding: '20px 24px',
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
          Recommended Repairs
        </div>
        <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: 0 }}>
          {estimate.inspection_id
            ? 'This repair estimate is based on the completed vehicle inspection. Review the recommendations below and approve the repairs you would like us to complete.'
            : 'Please review the recommended repairs below and approve the items you would like us to complete.'}
        </p>

        {/* STEP 3: Decision summary grid ─────────────────────────────────── */}
        {estimate.items.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 10,
            marginTop: 16,
          }}>
            {/* Approved */}
            <div style={{
              padding: '12px 14px',
              background: approvedItems.length > 0 ? '#f0fdf4' : '#f9fafb',
              border: `1px solid ${approvedItems.length > 0 ? '#86efac' : '#e5e7eb'}`,
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d', lineHeight: 1 }}>
                {approvedItems.length}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>
                Approved
              </div>
              {approvedItems.length > 0 && (
                <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>
                  ${approvedTotal.toFixed(2)}
                </div>
              )}
            </div>

            {/* Pending */}
            <div style={{
              padding: '12px 14px',
              background: remainingItems.length > 0 ? '#eff6ff' : '#f9fafb',
              border: `1px solid ${remainingItems.length > 0 ? '#bfdbfe' : '#e5e7eb'}`,
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1d4ed8', lineHeight: 1 }}>
                {remainingItems.length}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>
                Pending Review
              </div>
            </div>

            {/* Declined */}
            <div style={{
              padding: '12px 14px',
              background: declinedItems.length > 0 ? '#fef2f2' : '#f9fafb',
              border: `1px solid ${declinedItems.length > 0 ? '#fca5a5' : '#e5e7eb'}`,
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>
                {declinedItems.length}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>
                Declined
              </div>
            </div>

            {/* Estimate total */}
            <div style={{
              padding: '12px 14px',
              background: '#f8fafc',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                ${round2(Number(estimate.total)).toFixed(2)}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>
                Estimate Total
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Trust / next-step line */}
        <p style={{ fontSize: 12, color: '#94a3b8', margin: '12px 0 0', lineHeight: 1.5 }}>
          You can review each recommended repair below and choose which items to approve.
        </p>
      </div>

      {/* ── Share bar ─────────────────────────────────────────────────────── */}
      <ShareBar
        estimateId={estimate.id}
        customerName={customerName}
        shopName={shopName}
      />

      {/* ── Job cards — grouped by decision state ────────────────────────── */}

      {/* STEP 2: Pending Review section */}
      {remainingItems.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 8,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>
              Pending Review
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600,
              padding: '1px 7px', borderRadius: 20,
              background: '#eff6ff', color: '#1d4ed8',
              border: '1px solid #bfdbfe',
            }}>
              {remainingItems.length}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 10px', lineHeight: 1.5 }}>
            Please review the items below and choose which repairs you would like us to complete.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {remainingItems.map(item => (
              <JobCard
                key={item.id}
                item={item}
                decision={decisions[item.id] ?? null}
                onApprove={() => approve(item.id)}
                onDecline={() => decline(item.id)}
                onUndecide={() => undecide(item.id)}
                isSaving={saving.has(item.id)}
                saveError={saveErrors[item.id] ?? null}
                locked={isLocked ?? false}
              />
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: Approved section */}
      {approvedItems.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 10,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>
              Approved Repairs
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600,
              padding: '1px 7px', borderRadius: 20,
              background: '#f0fdf4', color: '#15803d',
              border: '1px solid #86efac',
            }}>
              {approvedItems.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {approvedItems.map(item => (
              <JobCard
                key={item.id}
                item={item}
                decision={decisions[item.id] ?? null}
                onApprove={() => approve(item.id)}
                onDecline={() => decline(item.id)}
                onUndecide={() => undecide(item.id)}
                isSaving={saving.has(item.id)}
                saveError={saveErrors[item.id] ?? null}
                locked={isLocked ?? false}
              />
            ))}
          </div>
        </div>
      )}

      {/* STEP 4: Declined section */}
      {declinedItems.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 10,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>
              Declined Repairs
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600,
              padding: '1px 7px', borderRadius: 20,
              background: '#fef2f2', color: '#dc2626',
              border: '1px solid #fca5a5',
            }}>
              {declinedItems.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {declinedItems.map(item => (
              <JobCard
                key={item.id}
                item={item}
                decision={decisions[item.id] ?? null}
                onApprove={() => approve(item.id)}
                onDecline={() => decline(item.id)}
                onUndecide={() => undecide(item.id)}
                isSaving={saving.has(item.id)}
                saveError={saveErrors[item.id] ?? null}
                locked={isLocked ?? false}
              />
            ))}
          </div>
        </div>
      )}

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

      {/* ── Final Authorization Block ─────────────────────────────────────── */}
      <FinalAuthorizationBlock
        approvedItemsCount={approvedItems.length}
        declinedItemsCount={declinedItems.length}
        pendingItemsCount={remainingItems.length}
        approvedTotal={approvedTotal}
        workOrderId={workOrderId}
        onAuthorize={handleAuthorizeEstimate}
        isReopening={estimate.status === 'reopened'}
      />

      {/* ── Warranty & Footer sections ─────────────────────────────────────────────── */}
      {profile?.warranty_text && (
        <div style={{
          background: '#fff',
          border: '1px solid var(--border-2)',
          borderRadius: 10,
          padding: '20px 24px',
          marginBottom: 20,
          marginTop: 20,
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            marginBottom: 8,
          }}>
            Warranty
          </div>
          <div style={{
            fontSize: 13,
            color: '#555',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.5',
          }}>
            {profile?.warranty_text}
          </div>
        </div>
      )}

      {profile?.invoice_footer && (
        <div style={{
          background: '#fff',
          border: '1px solid var(--border-2)',
          borderRadius: 10,
          padding: '20px 24px',
          marginBottom: 20,
          fontSize: 13,
          color: '#6B7280',
          lineHeight: '1.6',
          textAlign: 'center',
        }}>
          {profile?.invoice_footer}
        </div>
      )}

      {/* ── Work-order CTA ────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 24,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          justifyContent: 'flex-end',
          width: '100%',
          flexWrap: 'wrap',
        }}>
          {!allDecided && (
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {remainingItems.length} job{remainingItems.length !== 1 ? 's' : ''} still need a decision
            </span>
          )}
        </div>
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

interface ShareBarProps {
  estimateId:    string
  customerName:  string | null
  shopName:      string
}

function ShareBar({ estimateId, customerName, shopName }: ShareBarProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle')

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
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 2 }}>
            Customer link
          </div>
          {/* ── Hydration-safe: relative path only — identical on server + client ── */}
          <div style={{
            fontSize: 12,
            color: '#6B7280',
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
            color:  copyState === 'copied' ? '#15803d' : '#1e293b',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          {copyState === 'copied' ? '✓ Copied!' : '📋 Copy Link'}
        </button>

      </div>
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
  locked?:    boolean  // true if authorization completed and changes not allowed
}

function JobCard({ item, decision, onApprove, onDecline, onUndecide, isSaving, saveError, locked }: JobCardProps) {
  const laborCost     = round2((item.labor_hours ?? 0) * (item.labor_rate ?? 0))
  const partsSubtotal = getPartsSubtotal(item)
  const jobSubtotal   = getJobSubtotal(item)
  const hasParts      = (item.parts ?? []).length > 0

  // ── Card visual state (unchanged) ─────────────────────────────────────────
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

      {/* STEP 1+2+3: Card header — title / description / price / decision badge */}
      <div style={{ padding: '16px 18px 12px' }}>

        {/* Top row: title area + price column */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>

          {/* STEP 1: Title hierarchy */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: item.description ? 6 : 0 }}>
              {/* STEP 1: Prominent title */}
              <span style={{ fontSize: 16, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
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
            {/* STEP 1: Description as supportive text */}
            {item.description && (
              <div style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.55 }}>
                {item.description}
              </div>
            )}
          </div>

          {/* STEP 2+3: Right column — price (prominent) + decision state */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            {/* STEP 2: Total price front-and-center */}
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 20,
              fontWeight: 800,
              color: decision === 'approved' ? '#15803d' : '#111827',
              lineHeight: 1,
            }}>
              ${jobSubtotal.toFixed(2)}
            </div>

            {/* STEP 3: Decision badge — Pending / Approved (undoable) / Declined (undoable) */}
            {decision ? (
              <button
                onClick={onUndecide}
                disabled={isSaving || locked}
                title={locked ? 'Authorization complete — cannot change' : isSaving ? 'Saving…' : 'Click to undo decision'}
                style={{
                  padding: '3px 10px',
                  borderRadius: 20,
                  border: 'none',
                  cursor: locked || isSaving ? 'not-allowed' : 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                  opacity: isSaving || locked ? 0.6 : 1,
                  background: decision === 'approved' ? '#dcfce7' : '#fee2e2',
                  color:      decision === 'approved' ? '#15803d' : '#dc2626',
                }}
              >
                {isSaving ? '…' : decision === 'approved' ? '✓ Approved' : '✗ Declined'}
                {!isSaving && !locked && (
                  <span style={{ marginLeft: 4, opacity: 0.5, fontSize: 10 }}>undo</span>
                )}
              </button>
            ) : (
              <span style={{
                fontSize: 11, fontWeight: 600,
                padding: '3px 10px', borderRadius: 20,
                background: '#eff6ff', color: '#1d4ed8',
                border: '1px solid #bfdbfe',
              }}>
                Pending Review
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Labor row (secondary detail) ────────────────────────────────── */}
      {(item.labor_hours ?? 0) > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '5px 18px',
          borderTop: '1px solid var(--border-2)',
          background: 'var(--surface-2,#f8fafc)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>🔧</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Labor&nbsp;
              <span style={{ fontSize: 11 }}>
                {item.labor_hours} hrs @ ${Number(item.labor_rate ?? 0).toFixed(2)}/hr
              </span>
            </span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
            ${laborCost.toFixed(2)}
          </span>
        </div>
      )}

      {/* ── Parts list (secondary detail, unchanged) ─────────────────────── */}
      {hasParts && (
        <PartsList parts={item.parts ?? []} partsSubtotal={partsSubtotal} />
      )}

      {/* ── Job total bar (context row) ──────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 18px',
        borderTop: '1px solid var(--border-2)',
        background: decision === 'approved'
          ? '#dcfce7'
          : decision === 'declined'
          ? '#fee2e2'
          : 'var(--surface-2,#f8fafc)',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
          Repair Total
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 700,
          color: decision === 'approved' ? '#15803d' : '#374151',
        }}>
          ${jobSubtotal.toFixed(2)}
        </span>
      </div>

      {/* STEP 4: Action area — "Your decision" label + Approve (filled) / Decline (outline) */}
      {!decision && !locked && (
        <div style={{
          padding: '12px 18px 14px',
          borderTop: '1px solid var(--border-2)',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.07em',
            marginBottom: 8,
          }}>
            Your decision
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onApprove}
              disabled={isSaving}
              style={{
                flex: 2,
                padding: '11px 0',
                borderRadius: 7,
                border: '2px solid #16a34a',
                background: '#16a34a',
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                cursor: isSaving ? 'wait' : 'pointer',
                opacity: isSaving ? 0.55 : 1,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!isSaving) e.currentTarget.style.background = '#15803d' }}
              onMouseLeave={e => (e.currentTarget.style.background = '#16a34a')}
            >
              {isSaving ? '…' : '✓ Approve'}
            </button>
            <button
              onClick={onDecline}
              disabled={isSaving}
              style={{
                flex: 1,
                padding: '11px 0',
                borderRadius: 7,
                border: '2px solid #e2e8f0',
                background: '#fff',
                color: '#64748b',
                fontWeight: 600,
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
        </div>
      )}

      {/* ── Save error (unchanged) ───────────────────────────────────────── */}
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
        color: '#1e293b',
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
              amount={fullEstimateLaborSubtotal ?? 0}
              color="#6B7280"
              bold={false}
              small
            />
          )}
          {(fullEstimatePartsSubtotal ?? 0) > 0 && (
            <SummaryRow
              label="Parts & Materials"
              amount={fullEstimatePartsSubtotal ?? 0}
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
            color="#111827"
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
      <span style={{ fontSize: size, color: '#374151', fontWeight: bold ? 700 : 400 }}>
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

// ─────────────────────────────────────────────────────────────────────────────
// InspectionFindingCard — display only, no approval logic
// ─────────────────────────────────────────────────────────────────────────────

function InspectionFindingCard({ rec }: { rec: Recommendation }) {
  const isUrgent = rec.status === 'urgent' || rec.priority === 'high' || rec.priority === 'urgent'
  const isWarning = !isUrgent && (rec.status === 'attention' || rec.priority === 'medium')

  const badgeStyle: React.CSSProperties = isUrgent
    ? { background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }
    : isWarning
      ? { background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }
      : { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }

  const badgeLabel = isUrgent ? '⚠ Urgent' : isWarning ? '! Attention' : '✓ Noted'

  const cardBorder: React.CSSProperties = isUrgent
    ? { border: '1px solid #fca5a5', borderLeft: '4px solid #dc2626' }
    : isWarning
      ? { border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b' }
      : { border: '1px solid #d1fae5', borderLeft: '4px solid #16a34a' }

  return (
    <div style={{
      borderRadius: 8,
      padding: '12px 14px',
      background: '#fafafa',
      ...cardBorder,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Severity badge */}
        <span style={{
          flexShrink: 0,
          marginTop: 2,
          padding: '2px 8px',
          borderRadius: 5,
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap' as const,
          ...badgeStyle,
        }}>
          {badgeLabel}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Source item label (e.g. "Brake Pads") */}
          {rec.item_name && rec.item_name !== rec.title && (
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>
              {rec.item_name}
            </div>
          )}

          {/* Finding title */}
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
            {rec.title}
          </div>

          {/* Description */}
          {rec.description && (
            <div style={{ fontSize: 13, color: '#374151', marginTop: 4, lineHeight: 1.5 }}>
              {rec.description}
            </div>
          )}

          {/* Estimated price (informational) */}
          {rec.estimated_price != null && rec.estimated_price > 0 && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
              Est. cost: ${Number(rec.estimated_price).toFixed(2)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
