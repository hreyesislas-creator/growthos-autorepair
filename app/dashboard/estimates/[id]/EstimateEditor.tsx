'use client'

import { useState, useCallback, useMemo, useId, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { EstimateWithItems, EstimateItem, EstimateItemPart, EstimateItemDecision, ServiceJobWithCategory } from '@/lib/types'
import {
  saveEstimate,
  saveEstimateItems,
  saveEstimateItemParts,
  type EstimateItemInput,
  type EstimateItemPartInput,
} from '../actions'
import { createWorkOrderFromEstimate, voidEstimate } from './actions'
import ArchiveConfirmModal from '@/components/dashboard/ArchiveConfirmModal'
import type { ReasonOption } from '@/components/dashboard/ArchiveConfirmModal'

// ── Constants ─────────────────────────────────────────────────────────────────

// NOTE: 'part' is intentionally excluded — parts must live as nested children
// under a labor/job item via the PartsSection, never as top-level line items.
// ── Void reason options ───────────────────────────────────────────────────────

const VOID_REASONS: ReasonOption[] = [
  { value: 'customer_declined', label: 'Customer declined'           },
  { value: 'replaced_by_new',   label: 'Replaced by a newer estimate'},
  { value: 'created_in_error',  label: 'Created in error'            },
  { value: 'duplicate',         label: 'Duplicate estimate'          },
  { value: 'other',             label: 'Other (see note)'            },
]

const CATEGORIES = [
  { value: 'labor', label: 'Labor' },
  { value: 'fee',   label: 'Fee'   },
  { value: 'misc',  label: 'Misc'  },
] as const

const STATUSES = [
  { value: 'draft',      label: 'Draft',       style: { background: '#f1f5f9', color: '#475569' } },
  { value: 'presented',  label: 'Presented',   style: { background: '#eff6ff', color: '#1d4ed8' } },
  { value: 'authorized', label: 'Authorized',  style: { background: '#fef3c7', color: '#92400e' } },
  { value: 'approved',   label: 'Approved',    style: { background: '#f0fdf4', color: '#15803d' } },
  { value: 'declined',   label: 'Declined',    style: { background: '#fff7ed', color: '#c2410c' } },
  { value: 'reopened',   label: 'Reopened',    style: { background: '#fef3c7', color: '#92400e' } },
] as const

type Category = 'labor' | 'part' | 'fee' | 'misc'
type Status   = 'draft' | 'presented' | 'authorized' | 'approved' | 'declined' | 'reopened'

// ── Local part shape ──────────────────────────────────────────────────────────

interface LocalPart {
  _key:            string   // React key, temp for new parts
  id?:             string   // DB id if persisted
  name:            string
  part_number:     string   // advisor-entered part / SKU number
  quantity:        number
  unit_cost:       number
  profit_amount:   number
  unit_sell_price: number   // computed: unit_cost + profit_amount
  line_total:      number   // computed: quantity * unit_sell_price
  display_order:   number
}

// ── Local item shape ──────────────────────────────────────────────────────────

interface LocalItem {
  _key:        string
  id?:         string
  category:    Category
  title:       string
  description: string
  // Job-based pricing (active when service_job_id is set)
  service_job_id: string | null
  labor_hours:    number
  labor_rate:     number
  // Legacy manual pricing (active when service_job_id is null)
  quantity:    number
  unit_price:  number
  // Parts (nested)
  parts:       LocalPart[]
  // Shared
  item_notes:    string
  display_order: number
  source_type:   EstimateItemInput['source_type']
  service_recommendation_id?: string | null
  inspection_item_id?:        string | null
  needs_review: boolean
}

type JobGroup = { categoryName: string; jobs: ServiceJobWithCategory[] }

// ── Helpers ───────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Recomputes the derived sell price and totals for a part using the estimate-level
 * Parts Markup %.
 *
 * Formula:
 *   unit_sell_price = unit_cost × (1 + markupPercent / 100)
 *   profit_amount   = unit_sell_price − unit_cost   (stored for reporting only)
 *   line_total      = quantity × unit_sell_price
 *
 * Tax is applied to parts only — labor is never taxed.
 */
function computePart(
  p: Omit<LocalPart, 'profit_amount' | 'unit_sell_price' | 'line_total'>,
  markupPercent: number,
): LocalPart {
  const unitSell    = round2(p.unit_cost * (1 + markupPercent / 100))
  const profitAmt   = round2(unitSell - p.unit_cost)
  const lineTotal   = round2(p.quantity * unitSell)
  return { ...p, profit_amount: profitAmt, unit_sell_price: unitSell, line_total: lineTotal }
}

function getItemPartsTotal(parts: LocalPart[]): number {
  return round2(parts.reduce((s, p) => s + p.line_total, 0))
}

function getLineTotal(item: LocalItem): number {
  if (item.service_job_id) {
    return round2(round2(item.labor_hours * item.labor_rate) + getItemPartsTotal(item.parts))
  }
  // Manual labor items: priced by hours × rate, not qty × unit_price
  if (item.category === 'labor') {
    return round2(item.labor_hours * item.labor_rate)
  }
  return round2(item.quantity * item.unit_price)
}

function dbPartToLocal(part: EstimateItemPart, idx: number): LocalPart {
  return {
    _key:            part.id,
    id:              part.id,
    name:            part.name,
    part_number:     (part as any).part_number ?? '',
    quantity:        Number(part.quantity),
    unit_cost:       Number(part.unit_cost),
    profit_amount:   Number(part.profit_amount),
    unit_sell_price: Number(part.unit_sell_price),
    line_total:      Number(part.line_total),
    display_order:   part.display_order ?? idx,
  }
}

function dbItemToLocal(item: EstimateItem, idx: number): LocalItem {
  return {
    _key:           item.id,
    id:             item.id,
    category:       item.category as Category,
    title:          item.title,
    description:    item.description ?? '',
    service_job_id: item.service_job_id ?? null,
    // Keep the raw DB value (may be null/0) so the useState initializer can
    // decide whether to apply defaults (see below).
    labor_hours:    Number(item.labor_hours ?? 0),
    labor_rate:     Number(item.labor_rate  ?? 0),
    quantity:       Number(item.quantity),
    unit_price:     Number(item.unit_price),
    item_notes:     item.notes ?? '',
    display_order:  item.display_order ?? idx,
    source_type:    item.source_type,
    service_recommendation_id: item.service_recommendation_id,
    inspection_item_id:        item.inspection_item_id,
    needs_review:   item.needs_review,
    // Parts are re-computed with markup % in the useState initializer —
    // dbPartToLocal just lifts the raw stored values.
    parts:          (item.parts ?? []).map(dbPartToLocal),
  }
}

function statusStyle(status: string) {
  return STATUSES.find(s => s.value === status)?.style
    ?? { background: '#f1f5f9', color: '#475569' }
}

let _keyCounter = 0
function newKey() { return `new-${++_keyCounter}` }

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  estimate:          EstimateWithItems
  inspectionId?:     string | null
  serviceJobs:       ServiceJobWithCategory[]
  defaultLaborRate:  number
  initialDecisions:  EstimateItemDecision[]   // pre-loaded snapshot from DB — read-only in editor
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EstimateEditor({
  estimate,
  inspectionId,
  serviceJobs,
  defaultLaborRate,
  initialDecisions,
}: Props) {
  const router  = useRouter()
  const inputId = useId()

  // ── Header state ───────────────────────────────────────────────────────────
  const [status,        setStatus]        = useState<Status>(estimate.status as Status)
  const [notes,         setNotes]         = useState(estimate.notes          ?? '')
  const [internalNotes, setInternalNotes] = useState(estimate.internal_notes ?? '')
  const [taxRate,       setTaxRate]       = useState(
    estimate.tax_rate != null ? String(round2(Number(estimate.tax_rate) * 100)) : '',
  )
  const [taxAmountRaw, setTaxAmountRaw] = useState(String(estimate.tax_amount ?? 0))

  // ── Parts pricing — estimate-level markup % ────────────────────────────────
  // Stored on the estimate row so it persists across sessions.
  // Formula: unit_sell_price = unit_cost × (1 + partsMarkupPercent / 100)
  // Tax is applied to parts only — labor is never taxed.
  const [partsMarkupPercent, setPartsMarkupPercent] = useState(
    () => Number(estimate.parts_markup_percent ?? 0),
  )

  // ── Items state ────────────────────────────────────────────────────────────
  // On load we patch three things so the UI is immediately correct:
  //   1. Labor items with no stored rate → seed from shop's defaultLaborRate
  //   2. Labor items with no stored hours → default to 1.0
  //   3. All part rows → recompute sell/total using the estimate's markup %
  //      (guards against stale values if markup changed since last save)
  //
  // NOTE: items imported from an inspection / recommendation are stored in the
  // DB with whatever category the import pipeline used (often 'misc').  They
  // represent repair/service work and must render in the same labor-job layout
  // as manually-added labor rows.  We detect them by source_type !== 'manual'
  // and normalise their category to 'labor' here so isLaborMode fires correctly
  // in ItemRow.  Items explicitly marked 'fee' or 'misc' are left untouched.
  const [items, setItems] = useState<LocalItem[]>(() => {
    const initMarkup = Number(estimate.parts_markup_percent ?? 0)
    return estimate.items.map((item, idx) => {
      const local = dbItemToLocal(item, idx)

      // An item should use the labor/job layout if it is explicitly 'labor'
      // OR if it was imported from an inspection / recommendation pipeline
      // (source_type !== 'manual').  The category stored by the import pipeline
      // (often 'misc') is NOT a reliable signal — it just reflects the pipeline
      // default, not the advisor's intent.  source_type is the authoritative
      // discriminator: anything the advisor did not type themselves is service work.
      const isServiceItem =
        local.category === 'labor' ||
        local.source_type !== 'manual'

      if (isServiceItem) {
        local.category = 'labor'   // ensures isLaborMode = true in ItemRow
        if (!local.labor_rate  && defaultLaborRate > 0) local.labor_rate  = defaultLaborRate
        if (!local.labor_hours)                         local.labor_hours = 1
      }

      return { ...local, parts: local.parts.map(p => computePart(p, initMarkup)) }
    })
  })

  // ── Recompute ALL part rows whenever Parts Markup % changes ───────────────
  // This fires when the advisor edits the markup field so every part's
  // sell price and line total update instantly — no save required.
  useEffect(() => {
    setItems(prev => prev.map(item => ({
      ...item,
      parts: item.parts.map(({ profit_amount: _a, unit_sell_price: _b, line_total: _c, ...base }) =>
        computePart(base, partsMarkupPercent),
      ),
    })))
  }, [partsMarkupPercent])

  // ── Check for existing work order on mount ──────────────────────────────
  // If this estimate already has a work order, populate woResult so the
  // button shows "View Work Order" instead of "Create Work Order".
  // This happens silently on mount and persists across refreshes.
  useEffect(() => {
    const checkExistingWorkOrder = async () => {
      try {
        const res = await fetch(
          `/api/estimates/${estimate.id}/work-order`,
          { method: 'GET' }
        )
        if (res.ok) {
          const data = await res.json()
          if (data.id) {
            setWoResult({ id: data.id, work_order_number: data.work_order_number })
          }
        }
      } catch (err) {
        console.error('[EstimateEditor] failed to check for existing work order:', err)
      } finally {
        setWoLoading(false)
      }
    }
    checkExistingWorkOrder()
  }, [estimate.id])

  // ── Async state ────────────────────────────────────────────────────────────
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState<string | null>(null)
  const [savedAt,    setSavedAt]    = useState<Date | null>(null)

  // ── Present to customer state ─────────────────────────────────────────────
  const [presenting,   setPresenting]   = useState(false)
  const [presentError, setPresentError] = useState<string | null>(null)
  // Show the share link once presented OR if the estimate is already presented/approved/declined
  const [shareVisible, setShareVisible] = useState(
    () => ['presented', 'approved', 'declined'].includes(estimate.status),
  )
  const [copied, setCopied] = useState(false)

  // ── Work order creation state ─────────────────────────────────────────────
  const [woCreating, setWoCreating] = useState(false)
  const [woError,    setWoError]    = useState<string | null>(null)
  // Populated once a work order is successfully created or found (idempotent)
  const [woResult,   setWoResult]   = useState<{ id: string; work_order_number: string | null } | null>(null)
  const [woLoading,  setWoLoading]  = useState(true)  // Loading state for initial check

  // ── Delete line item confirmation modal state ──────────────────────────────
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteConfirmKey,  setDeleteConfirmKey]  = useState<string | null>(null)  // Item key to delete

  // ── Void modal state ───────────────────────────────────────────────────────
  const [voidOpen,    setVoidOpen]    = useState(false)
  const [voidSubmit,  setVoidSubmit]  = useState(false)
  const [voidError,   setVoidError]   = useState<string | null>(null)
  const [voidTier,    setVoidTier]    = useState<'standard' | 'strong_warning' | 'hard_block'>('standard')
  const [voidWarning, setVoidWarning] = useState('')

  // ── Job groups for <optgroup> ─────────────────────────────────────────────
  // serviceJobs comes pre-sorted by category.sort_order then name from getServiceJobs()
  const jobGroups = useMemo<JobGroup[]>(() => {
    const map = new Map<string, JobGroup>()
    for (const job of serviceJobs) {
      const catName = job.category?.name ?? 'Other'
      if (!map.has(catName)) map.set(catName, { categoryName: catName, jobs: [] })
      map.get(catName)!.jobs.push(job)
    }
    return Array.from(map.values())
  }, [serviceJobs])

  // ── Derived totals ─────────────────────────────────────────────────────────
  //
  // RULE: Tax applies to PARTS ONLY — labor is never taxed.
  //
  // Job-mode items (service_job_id set) contain BOTH labor and parts costs.
  // We split them here so the tax base is accurate regardless of item category.

  // Labor: hours × rate from job items + manual 'labor' category items
  // Both use labor_hours × labor_rate; getLineTotal handles both cases.
  const subtotalLabor = round2(
    items
      .filter(i => !!i.service_job_id)
      .reduce((s, i) => s + round2(i.labor_hours * i.labor_rate), 0)
    +
    items
      .filter(i => !i.service_job_id && i.category === 'labor')
      .reduce((s, i) => s + getLineTotal(i), 0),
  )

  // Parts: nested child rows on ALL labor/job items.
  // Top-level 'part' items are not allowed — parts must live nested under a job.
  const subtotalParts = round2(
    items
      .filter(i => !!i.service_job_id || i.category === 'labor')
      .reduce((s, i) => s + getItemPartsTotal(i.parts), 0),
  )

  // Other (fee, misc) — shown in subtotal but NOT taxed
  const subtotalOther = round2(
    items
      .filter(i => !i.service_job_id && i.category !== 'labor')
      .reduce((s, i) => s + getLineTotal(i), 0),
  )

  const subtotal = round2(subtotalLabor + subtotalParts + subtotalOther)

  // Tax base is parts only
  const taxableSubtotal = subtotalParts
  const rateNum         = taxRate.trim() !== '' ? parseFloat(taxRate) / 100 : null
  const taxAmountNum    = rateNum != null
    ? round2(taxableSubtotal * rateNum)
    : round2(parseFloat(taxAmountRaw) || 0)
  const total = round2(subtotal + taxAmountNum)

  // ── Decision summary — derived from initialDecisions snapshot ─────────────
  //
  // initialDecisions is a read-only snapshot loaded at page render.  The editor
  // does not approve/decline items itself; decisions come from PresentationView.
  // A refresh (router.refresh() after save) will re-run the server component and
  // pass an updated snapshot the next time the page loads.
  //
  // These are plain const derivations — no useState or useEffect needed.
  const approvedItemIds = new Set(
    initialDecisions.filter(d => d.decision === 'approved').map(d => d.estimate_item_id),
  )
  const declinedItemIds = new Set(
    initialDecisions.filter(d => d.decision === 'declined').map(d => d.estimate_item_id),
  )
  const decisionApprovedCount = approvedItemIds.size
  const decisionDeclinedCount = declinedItemIds.size
  const decisionPendingCount  = estimate.items.length - decisionApprovedCount - decisionDeclinedCount
  const decisionApprovedAmount = round2(
    estimate.items
      .filter(i => approvedItemIds.has(i.id))
      .reduce((sum, i) => sum + Number(i.line_total), 0),
  )
  // Show the summary bar if the estimate has been presented (status = 'presented')
  // OR if any decisions already exist (handles manual status overrides gracefully).
  const showDecisionSummary =
    estimate.status === 'presented' || initialDecisions.length > 0

  // ── Approved totals breakdown (from DB estimate.items pre-calculated fields) ──
  // CRITICAL: Use labor_total and parts_total from DB, not recalculated.
  // These frozen values guarantee approved summary matches work order and invoice totals.
  // estimate.items.labor_total = frozen labor for that item
  // estimate.items.parts_total = frozen parts for that item
  // estimate.items.line_total = frozen total (labor + parts)
  const approvedItems = estimate.items.filter(i => approvedItemIds.has(i.id))
  const approvedLabor = round2(
    approvedItems.reduce((s, i) => s + Number(i.labor_total ?? 0), 0)
  )
  const approvedParts = round2(
    approvedItems.reduce((s, i) => s + Number(i.parts_total ?? 0), 0)
  )
  const approvedOther = round2(
    approvedItems
      .filter(i => !i.service_job_id && i.category !== 'labor')
      .reduce((s, i) => s + Number(i.line_total ?? 0), 0)
  )
  const approvedSubtotal = round2(approvedLabor + approvedParts + approvedOther)
  const approvedTaxRate = rateNum ?? 0
  const approvedTaxAmount = approvedTaxRate > 0
    ? round2(approvedParts * approvedTaxRate)
    : 0
  const approvedTotal = round2(approvedSubtotal + approvedTaxAmount)
  const showApprovedSummary = approvedItems.length > 0

  // ── Item mutation helpers ──────────────────────────────────────────────────
  const addItem = useCallback(() => {
    setItems(prev => [
      ...prev,
      {
        _key:           newKey(),
        category:       'labor',
        title:          '',
        description:    '',
        service_job_id: null,
        labor_hours:    1,
        labor_rate:     defaultLaborRate,
        quantity:       1,
        unit_price:     0,
        parts:          [],
        item_notes:     '',
        display_order:  prev.length,
        source_type:    'manual',
        needs_review:   false,
      },
    ])
  }, [defaultLaborRate])

  const removeItem = useCallback((key: string) => {
    setItems(prev => prev.filter(i => i._key !== key))
  }, [])

  const updateItem = useCallback(
    (key: string, field: Partial<LocalItem>) => {
      setItems(prev => prev.map(i => i._key === key ? { ...i, ...field } : i))
    },
    [],
  )

  // ── Part mutation helpers ──────────────────────────────────────────────────
  const addPart = useCallback((itemKey: string) => {
    setItems(prev => prev.map(i => {
      if (i._key !== itemKey) return i
      const newPart = computePart(
        { _key: newKey(), name: '', part_number: '', quantity: 1, unit_cost: 0, display_order: i.parts.length },
        partsMarkupPercent,
      )
      return { ...i, parts: [...i.parts, newPart] }
    }))
  }, [partsMarkupPercent])

  const removePart = useCallback((itemKey: string, partKey: string) => {
    setItems(prev => prev.map(i =>
      i._key === itemKey
        ? { ...i, parts: i.parts.filter(p => p._key !== partKey) }
        : i,
    ))
  }, [])

  const updatePart = useCallback((itemKey: string, partKey: string, field: Partial<LocalPart>) => {
    setItems(prev => prev.map(i => {
      if (i._key !== itemKey) return i
      return {
        ...i,
        parts: i.parts.map(p => {
          if (p._key !== partKey) return p
          // Strip previously-computed fields so computePart always starts from base data.
          const { profit_amount: _a, unit_sell_price: _b, line_total: _c, ...baseP } = p
          const merged = { ...baseP, ...field }
          // Recompute sell price and line total whenever name/qty/cost changes.
          // Markup % comes from estimate-level setting — not per-part.
          return computePart(merged, partsMarkupPercent)
        }),
      }
    }))
  }, [partsMarkupPercent])

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)

    // Ensure all parts are recalculated with the current markup % before save
    // (guards against stale computed values if part fields or markup changed)
    const itemsWithFreshParts = items.map(i => ({
      ...i,
      parts: i.parts.map(({ profit_amount: _a, unit_sell_price: _b, line_total: _c, ...base }) =>
        computePart(base, partsMarkupPercent),
      ),
    }))

    // Build items payload — parts_total pre-computed from local parts
    const itemsPayload: EstimateItemInput[] = itemsWithFreshParts.map((i, idx) => {
      const isJobMode   = !!i.service_job_id
      // Manual labor items also use labor_hours × labor_rate for pricing
      const isLaborItem = isJobMode || i.category === 'labor'
      const partsTotal  = getItemPartsTotal(i.parts)
      return {
        ...(i.id ? { id: i.id } : {}),
        source_type:               i.source_type,
        category:                  i.category,
        title:                     i.title || '(untitled)',
        description:               i.description || null,
        service_job_id:            i.service_job_id ?? null,
        quantity:                  isJobMode ? 1 : i.quantity,
        unit_price:                isJobMode ? 0 : i.unit_price,
        labor_hours:               isLaborItem ? i.labor_hours : null,
        labor_rate:                isLaborItem ? i.labor_rate  : null,
        labor_total:               isLaborItem ? round2(i.labor_hours * i.labor_rate) : 0,
        parts_total:               isLaborItem ? partsTotal : 0,
        notes:                     i.item_notes || null,
        display_order:             idx,
        service_recommendation_id: i.service_recommendation_id ?? null,
        inspection_item_id:        i.inspection_item_id        ?? null,
        needs_review:              i.needs_review,
      }
    })

    const itemsResult = await saveEstimateItems(estimate.id, itemsPayload)
    if ('error' in itemsResult) {
      setSaveError(itemsResult.error)
      setSaving(false)
      return
    }

    // Build parts payload — match new items by display_order
    const allParts: EstimateItemPartInput[] = []
    itemsWithFreshParts.forEach((localItem, idx) => {
      // Find the saved item: existing ones by ID, new ones by display_order
      const dbItemId = localItem.id
        ? localItem.id
        : itemsResult.data.find(si => si.display_order === idx)?.id

      if (!dbItemId) return

      localItem.parts.forEach((part, pIdx) => {
        allParts.push({
          ...(part.id ? { id: part.id } : {}),
          estimate_item_id: dbItemId,
          name:             part.name || '(part)',
          quantity:         part.quantity,
          unit_cost:        part.unit_cost,
          profit_amount:    part.profit_amount,
          unit_sell_price:  part.unit_sell_price,
          line_total:       part.line_total,
          display_order:    pIdx,
        })
      })
    })

    const partsErr = await saveEstimateItemParts(estimate.id, allParts)
    if (partsErr) {
      setSaveError(partsErr.error)
      setSaving(false)
      return
    }

    const taxRateToSave = taxRate.trim() !== '' ? parseFloat(taxRate) / 100 : null

    const headerErr = await saveEstimate(estimate.id, {
      status,
      notes:                notes         || null,
      internal_notes:       internalNotes || null,
      tax_rate:             taxRateToSave,
      parts_markup_percent: partsMarkupPercent,
      ...(taxRateToSave == null
        ? { tax_amount: round2(parseFloat(taxAmountRaw) || 0) }
        : {}),
    })

    if (headerErr) {
      setSaveError(headerErr.error)
      setSaving(false)
      return
    }

    setSavedAt(new Date())
    setSaving(false)
    router.refresh()
  }

  // ── Present to customer ────────────────────────────────────────────────────
  // Saves all items + header (forcing status = 'sent'), then reveals the share link.
  const handlePresent = async () => {
    setPresenting(true)
    setPresentError(null)

    // Ensure all parts are recalculated with the current markup % before present
    const itemsWithFreshParts = items.map(i => ({
      ...i,
      parts: i.parts.map(({ profit_amount: _a, unit_sell_price: _b, line_total: _c, ...base }) =>
        computePart(base, partsMarkupPercent),
      ),
    }))

    // Build items payload — parts_total pre-computed from local parts
    const itemsPayload: EstimateItemInput[] = itemsWithFreshParts.map((i, idx) => {
      const isJobMode   = !!i.service_job_id
      // Manual labor items also use labor_hours × labor_rate for pricing
      const isLaborItem = isJobMode || i.category === 'labor'
      const partsTotal  = getItemPartsTotal(i.parts)
      return {
        ...(i.id ? { id: i.id } : {}),
        source_type:               i.source_type,
        category:                  i.category,
        title:                     i.title || '(untitled)',
        description:               i.description || null,
        service_job_id:            i.service_job_id ?? null,
        quantity:                  isJobMode ? 1 : i.quantity,
        unit_price:                isJobMode ? 0 : i.unit_price,
        labor_hours:               isLaborItem ? i.labor_hours : null,
        labor_rate:                isLaborItem ? i.labor_rate  : null,
        labor_total:               isLaborItem ? round2(i.labor_hours * i.labor_rate) : 0,
        parts_total:               isLaborItem ? partsTotal : 0,
        notes:                     i.item_notes || null,
        display_order:             idx,
        service_recommendation_id: i.service_recommendation_id ?? null,
        inspection_item_id:        i.inspection_item_id        ?? null,
        needs_review:              i.needs_review,
      }
    })

    const itemsResult = await saveEstimateItems(estimate.id, itemsPayload)
    if ('error' in itemsResult) {
      setPresentError(itemsResult.error)
      setPresenting(false)
      return
    }

    // Build parts payload — match new items by display_order
    const allParts: EstimateItemPartInput[] = []
    itemsWithFreshParts.forEach((localItem, idx) => {
      const dbItemId = localItem.id
        ? localItem.id
        : itemsResult.data.find(si => si.display_order === idx)?.id

      if (!dbItemId) return

      localItem.parts.forEach((part, pIdx) => {
        allParts.push({
          ...(part.id ? { id: part.id } : {}),
          estimate_item_id: dbItemId,
          name:             part.name || '(part)',
          quantity:         part.quantity,
          unit_cost:        part.unit_cost,
          profit_amount:    part.profit_amount,
          unit_sell_price:  part.unit_sell_price,
          line_total:       part.line_total,
          display_order:    pIdx,
        })
      })
    })

    const partsErr = await saveEstimateItemParts(estimate.id, allParts)
    if (partsErr) {
      setPresentError(partsErr.error)
      setPresenting(false)
      return
    }

    const taxRateToSave = taxRate.trim() !== '' ? parseFloat(taxRate) / 100 : null
    const headerErr = await saveEstimate(estimate.id, {
      status:               'presented',
      notes:                notes         || null,
      internal_notes:       internalNotes || null,
      tax_rate:             taxRateToSave,
      parts_markup_percent: partsMarkupPercent,
      ...(taxRateToSave == null
        ? { tax_amount: round2(parseFloat(taxAmountRaw) || 0) }
        : {}),
    })

    if (headerErr) {
      setPresentError(headerErr.error)
      setPresenting(false)
      return
    }

    // Update local state to reflect the new status
    setStatus('presented')
    setShareVisible(true)
    setPresenting(false)
    router.refresh()
  }

  function copyShareLink() {
    const url = `${window.location.origin}/e/${estimate.id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  // ── Create Work Order ──────────────────────────────────────────────────────
  //
  // Calls the server action which is fully idempotent:
  //   • If a WO already exists for this estimate, the backend returns it.
  //   • If none exists, one is created from the approved items only.
  //
  // On success: stores the WO id + number to display the success banner.
  // On error:   stores the message for display in the sticky bar.
  //
  const handleCreateWorkOrder = async () => {
    // If work order already exists, navigate to it instead of creating again
    if (woResult) {
      router.push(`/dashboard/work-orders/${woResult.id}`)
      return
    }

    setWoCreating(true)
    setWoError(null)

    try {
      const wo = await createWorkOrderFromEstimate(estimate.id)
      setWoResult({ id: wo.id, work_order_number: wo.work_order_number })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create work order'
      setWoError(msg)
    } finally {
      setWoCreating(false)
    }
  }

  // ── Void modal handlers ────────────────────────────────────────────────────

  function openVoidModal() {
    setVoidError(null)
    // Use the saved estimate.status — not the local status state which may have
    // unsaved dropdown changes — to determine the correct warning tier.
    if (estimate.status === 'approved') {
      setVoidTier('strong_warning')
      setVoidWarning(
        'This estimate has been approved by the customer. ' +
        'Voiding it cannot be undone from this screen.',
      )
    } else if (estimate.status === 'presented') {
      setVoidTier('standard')
      setVoidWarning(
        'This estimate has been sent to the customer. ' +
        'It will be removed from your active records.',
      )
    } else {
      setVoidTier('standard')
      setVoidWarning(
        'This estimate will be removed from your active lists. ' +
        'It can still be viewed by an admin.',
      )
    }
    setVoidOpen(true)
  }

  async function handleVoidConfirm(reason: string, note: string) {
    setVoidSubmit(true)
    setVoidError(null)

    const result = await voidEstimate(estimate.id, reason, note || undefined)

    if (result === null) {
      setVoidOpen(false)
      router.push('/dashboard/estimates')
    } else {
      setVoidError(result.error)
      setVoidSubmit(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const backHref = inspectionId
    ? `/dashboard/inspections/${inspectionId}`
    : '/dashboard/estimates'

  return (
    <div className="dash-content">

      {/* ── Estimate header ────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 18, fontWeight: 700, color: 'var(--text)',
              fontFamily: 'var(--font-mono)',
            }}>
              {estimate.estimate_number}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              Created {new Date(estimate.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
              {estimate.creation_mode !== 'manual_entry' && (
                <span style={{
                  marginLeft: 8, fontSize: 10, fontWeight: 600,
                  padding: '1px 6px', borderRadius: 4,
                  background: 'var(--surface-3,#f1f5f9)', color: 'var(--text-3)',
                  textTransform: 'capitalize',
                }}>
                  {estimate.creation_mode.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--text-3)' }}>Status:</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as Status)}
              style={{
                fontSize: 12, fontWeight: 600, borderRadius: 6,
                border: '1px solid var(--border)', padding: '4px 8px',
                ...statusStyle(status),
                cursor: 'pointer',
              }}
            >
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Re-authorization Required banner (Phase 2) ───────────────────────── */}
      {estimate.status === 'reopened' && (
        <div style={{
          marginBottom: 16, padding: '16px 20px',
          background: 'linear-gradient(135deg, #fef3c7, #fcd34d)',
          border: '2px solid #f59e0b',
          borderRadius: 'var(--r12,12px)',
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontSize: 14, fontWeight: 700, color: '#92400e', marginBottom: 6,
              }}>
                Re-authorization Required
              </h3>
              <p style={{
                fontSize: 13, color: '#92400e', marginBottom: 12, lineHeight: 1.5,
              }}>
                Customer decisions can now be edited again. Open the customer approval page to review and re-authorize the approved repairs.
              </p>
              <p style={{
                fontSize: 12, color: '#b45309', fontStyle: 'italic', marginBottom: 12,
              }}>
                💡 If the approval page was already open, refresh it to load the reopened state.
              </p>
              <div style={{
                display: 'flex', gap: 8, flexWrap: 'wrap',
              }}>
                <button
                  type="button"
                  onClick={() => {
                    const approvalUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/e/${estimate.id}`
                    window.open(approvalUrl, '_blank')
                  }}
                  style={{
                    fontSize: 13, fontWeight: 700, padding: '10px 16px',
                    borderRadius: 'var(--r8,8px)', border: 'none',
                    background: '#f59e0b', color: '#fff',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#d97706'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#f59e0b'
                  }}
                >
                  ↗ Open Customer Approval Page
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const approvalUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/e/${estimate.id}`
                    navigator.clipboard.writeText(approvalUrl)
                    alert('Approval link copied to clipboard')
                  }}
                  style={{
                    fontSize: 13, fontWeight: 700, padding: '10px 16px',
                    borderRadius: 'var(--r8,8px)',
                    border: '1px solid #f59e0b', background: '#fff', color: '#f59e0b',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#fffbeb'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#fff'
                  }}
                >
                  📋 Copy Approval Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Line items ─────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: 'var(--text-3)',
          paddingBottom: 10, borderBottom: '1px solid var(--border-2)',
          marginBottom: 12,
        }}>
          Line Items
        </div>

        {/* ── Decision summary bar ────────────────────────────────────────── */}
        {/* Shown when the estimate has been presented or decisions already exist. */}
        {showDecisionSummary && (
          <div style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
            padding: '8px 12px',
            marginBottom: 12,
            background: 'var(--surface-2,#f8fafc)',
            border: '1px solid var(--border-2)',
            borderRadius: 8,
            fontSize: 12,
          }}>
            {/* Approved */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontWeight: 700, color: '#15803d',
              background: '#dcfce7', padding: '3px 10px', borderRadius: 999,
            }}>
              ✓ {decisionApprovedCount} Approved
              {decisionApprovedCount > 0 && (
                <span style={{ fontWeight: 400, opacity: 0.85 }}>
                  (${decisionApprovedAmount.toFixed(2)})
                </span>
              )}
            </span>

            {/* Declined */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontWeight: 700, color: '#dc2626',
              background: '#fee2e2', padding: '3px 10px', borderRadius: 999,
            }}>
              ✗ {decisionDeclinedCount} Declined
            </span>

            {/* Pending */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontWeight: 700, color: '#4b5563',
              background: '#e2e8f0', padding: '3px 10px', borderRadius: 999,
            }}>
              ○ {decisionPendingCount} Pending
            </span>

            {decisionPendingCount === 0 && decisionApprovedCount + decisionDeclinedCount > 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 4 }}>
                All decisions received
              </span>
            )}
          </div>
        )}

        {items.length === 0 ? (
          <div style={{
            padding: '20px 0', textAlign: 'center',
            fontSize: 13, color: 'var(--text-3)',
          }}>
            No items yet. Click <strong>Add Item</strong> to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(item => {
              // Determine decision status for this item
              const decisionStatus: 'approved' | 'declined' | 'pending' | undefined =
                item.id && approvedItemIds.has(item.id) ? 'approved' :
                item.id && declinedItemIds.has(item.id) ? 'declined' :
                showDecisionSummary ? 'pending' :
                undefined
              return (
                <ItemRow
                  key={item._key}
                  item={item}
                  jobGroups={jobGroups}
                  serviceJobs={serviceJobs}
                  defaultLaborRate={defaultLaborRate}
                  onUpdate={field => updateItem(item._key, field)}
                  onRemove={() => removeItem(item._key)}
                  onRequestRemove={() => {
                    setDeleteConfirmKey(item._key)
                    setDeleteConfirmOpen(true)
                  }}
                  onAddPart={() => addPart(item._key)}
                  onRemovePart={partKey => removePart(item._key, partKey)}
                  onUpdatePart={(partKey, field) => updatePart(item._key, partKey, field)}
                  decisionStatus={decisionStatus}
                />
              )
            })}
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={addItem}
            style={{ fontSize: 12 }}
          >
            + Add Item
          </button>
        </div>
      </div>

      {/* ── Approved Summary (when decisions exist) ────────────────────────── */}
      {showApprovedSummary && (
        <div className="card" style={{ marginBottom: 16, background: '#f0fdf4', padding: '16px', borderColor: '#d1fae5' }}>
          <div style={{
            fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: '#065f46',
            paddingBottom: 12, borderBottom: '1px solid #d1fae5',
            marginBottom: 14,
          }}>
            ✓ Approved Summary
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Line items with normal emphasis */}
            {approvedLabor > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 0', borderBottom: '1px solid #d1fae5',
              }}>
                <span style={{ fontSize: 12, color: '#1a1a1a', fontWeight: 400 }}>Labor</span>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#1a1a1a', fontWeight: 500 }}>
                  ${approvedLabor.toFixed(2)}
                </span>
              </div>
            )}

            {approvedParts > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 0', borderBottom: '1px solid #d1fae5',
              }}>
                <span style={{ fontSize: 12, color: '#1a1a1a', fontWeight: 400 }}>Parts</span>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#1a1a1a', fontWeight: 500 }}>
                  ${approvedParts.toFixed(2)}
                </span>
              </div>
            )}

            {approvedOther > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 0', borderBottom: '1px solid #d1fae5',
              }}>
                <span style={{ fontSize: 12, color: '#1a1a1a', fontWeight: 400 }}>Other</span>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#1a1a1a', fontWeight: 500 }}>
                  ${approvedOther.toFixed(2)}
                </span>
              </div>
            )}

            {/* Subtotal with medium emphasis */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: '1px solid #a7f3d0',
              marginTop: 2, marginBottom: 2,
            }}>
              <span style={{ fontSize: 12, color: '#1a1a1a', fontWeight: 600 }}>Subtotal</span>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#1a1a1a', fontWeight: 600 }}>
                ${approvedSubtotal.toFixed(2)}
              </span>
            </div>

            {/* Tax line with secondary styling */}
            {approvedTaxAmount > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '5px 0', marginBottom: 8,
              }}>
                <span style={{ fontSize: 11, color: '#555', fontWeight: 400, fontStyle: 'italic' }}>
                  Tax (parts only)
                </span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#555', fontWeight: 400 }}>
                  +${approvedTaxAmount.toFixed(2)}
                </span>
              </div>
            )}

            {/* Separator before total */}
            <div style={{ height: 2, background: '#6ee7b7', margin: '10px 0 10px 0' }} />

            {/* Total with strong emphasis */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0',
            }}>
              <span style={{ fontSize: 14, color: '#047857', fontWeight: 700 }}>Total Due</span>
              <span style={{ fontSize: 16, fontFamily: 'var(--font-mono)', color: '#047857', fontWeight: 700 }}>
                ${approvedTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Full Estimate (Reference Only) ────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: 'var(--text-3)',
          paddingBottom: 10, borderBottom: '1px solid var(--border-2)',
          marginBottom: 12,
        }}>
          Full Estimate {showApprovedSummary && '(Reference Only)'}
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>

          {/* ── Left: Subtotal breakdown ────────────────────────── */}
          <div style={{ flex: 1, minWidth: 200 }}>
            {subtotalLabor > 0 && <TotalRow label="Labor" amount={subtotalLabor} />}
            {subtotalParts > 0 && <TotalRow label="Parts" amount={subtotalParts} />}
            {subtotalOther > 0 && <TotalRow label="Other" amount={subtotalOther} />}
            <TotalRow label="Subtotal" amount={subtotal} bold />
            {/* Tax line — indented, labelled as parts-only */}
            {taxAmountNum > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0 3px 12px' }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>
                  Tax (parts only)
                </span>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
                  +${taxAmountNum.toFixed(2)}
                </span>
              </div>
            )}
            <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
            <TotalRow label="Total" amount={total} bold />
          </div>

          {/* ── Right: Settings ─────────────────────────────────── */}
          <div style={{ minWidth: 260 }}>

            {/* Parts Markup % */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
                Parts Markup %
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="0.1"
                  placeholder="e.g. 30"
                  value={partsMarkupPercent}
                  onChange={e => setPartsMarkupPercent(parseFloat(e.target.value) || 0)}
                  className="field-input"
                  style={{ width: 90, fontSize: 12, padding: '4px 8px' }}
                />
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  %
                  {partsMarkupPercent > 0 && (
                    <span style={{ marginLeft: 4 }}>
                      · $10 cost → ${round2(10 * (1 + partsMarkupPercent / 100)).toFixed(2)} sell
                    </span>
                  )}
                </span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
                sell price = cost × (1 + markup%) · applied to all parts on this estimate
              </div>
            </div>

            {/* Tax Rate — clarified as parts-only */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
                Tax Rate
                <span style={{
                  marginLeft: 6, fontSize: 10, fontWeight: 400,
                  color: '#b45309', background: '#fef3c7',
                  padding: '1px 5px', borderRadius: 3,
                }}>
                  parts only — labor is never taxed
                </span>
              </div>

              {/* Tax rate is set in Shop Settings — read-only here to prevent
                  per-estimate overrides. Tax amount is auto-calculated only. */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label style={{ fontSize: 12, color: 'var(--text-3)', minWidth: 60 }}>Rate %</label>
                <input
                  type="number"
                  value={taxRate}
                  readOnly
                  disabled
                  className="field-input"
                  style={{
                    width: 90, fontSize: 12, padding: '4px 8px',
                    opacity: 0.6, cursor: 'not-allowed', background: 'var(--surface-2,#f8fafc)',
                  }}
                />
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {taxRate
                    ? `= $${taxAmountNum.toFixed(2)} on $${subtotalParts.toFixed(2)} parts`
                    : '(no rate configured)'}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Notes ──────────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 96 }}>
        <div style={{
          fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: 'var(--text-3)',
          paddingBottom: 10, borderBottom: '1px solid var(--border-2)',
          marginBottom: 12,
        }}>
          Notes
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label
              htmlFor={`${inputId}-notes`}
              style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}
            >
              Customer-Facing Notes
            </label>
            <textarea
              id={`${inputId}-notes`}
              rows={4}
              className="field-textarea"
              placeholder="Scope of work, special instructions for the customer…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ fontSize: 13, width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <label
              htmlFor={`${inputId}-internal`}
              style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}
            >
              Internal Notes
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-3)', marginLeft: 6 }}>
                (shop only — not shown to customer)
              </span>
            </label>
            <textarea
              id={`${inputId}-internal`}
              rows={4}
              className="field-textarea"
              placeholder="Parts on order, tech assignments, follow-up reminders…"
              value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
              style={{ fontSize: 13, width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>
      </div>

      {/* ── Share link banner — shown after presenting or when already sent ── */}
      {shareVisible && (
        <div style={{
          marginBottom: 12, padding: '12px 16px',
          background: '#f0fdf4', border: '1px solid #86efac',
          borderRadius: 'var(--r8,8px)',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 14 }}>📋</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 2 }}>
              {status === 'approved'
                ? 'Customer approved this estimate'
                : status === 'declined'
                ? 'Customer declined this estimate'
                : 'Ready to send — share this link with your customer'}
            </div>
            <div style={{
              fontSize: 11, color: '#166534', fontFamily: 'var(--font-mono)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {`/e/${estimate.id}`}
            </div>
          </div>
          <button
            type="button"
            onClick={copyShareLink}
            style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px',
              borderRadius: 6, border: '1px solid #86efac',
              background: copied ? '#dcfce7' : '#fff',
              color: copied ? '#15803d' : '#16a34a',
              cursor: 'pointer', flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
          <a
            href={`/e/${estimate.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px',
              borderRadius: 6, border: '1px solid #86efac',
              background: '#fff', color: '#16a34a',
              textDecoration: 'none', flexShrink: 0,
            }}
          >
            Preview ↗
          </a>
        </div>
      )}

      {/* ── Work order success banner ────────────────────────────────────── */}
      {/* Shown once a work order has been created or found for this estimate. */}
      {woResult && (
        <div style={{
          marginBottom: 12, padding: '12px 16px',
          background: '#eff6ff', border: '1px solid #93c5fd',
          borderRadius: 'var(--r8,8px)',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 14 }}>🔧</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', marginBottom: 2 }}>
              Work order {woResult.work_order_number ?? woResult.id} is ready
            </div>
            <div style={{ fontSize: 11, color: '#1e40af' }}>
              {decisionApprovedCount} approved item{decisionApprovedCount !== 1 ? 's' : ''} ·
              ${decisionApprovedAmount.toFixed(2)}
            </div>
          </div>
          <a
            href={`/dashboard/work-orders/${woResult.id}`}
            style={{
              fontSize: 11, fontWeight: 700, padding: '4px 12px',
              borderRadius: 6, border: '1px solid #93c5fd',
              background: '#fff', color: '#1d4ed8',
              textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap',
            }}
          >
            View Work Order ↗
          </a>
        </div>
      )}

      {/* ── Work order out of sync warning (Phase 2) ────────────────────── */}
      {/* Shown when authorization has been reopened with an existing work order. */}
      {estimate.status === 'reopened' && woResult && (
        <div style={{
          marginBottom: 12, padding: '12px 16px',
          background: '#fef3c7', border: '1px solid #fcd34d',
          borderRadius: 'var(--r8,8px)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 2 }}>
              Work Order Out of Sync
            </div>
            <div style={{ fontSize: 11, color: '#92400e' }}>
              This estimate is being re-authorized. Changes here won't affect the existing work order until you sync them in Phase 3.
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky save bar ────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', bottom: 16,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r12,12px)', padding: '12px 16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      }}>
        {/* Status / error area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {(saveError || presentError || woError) ? (
            <span style={{ fontSize: 12, color: '#b91c1c' }}>
              ✕ {saveError ?? presentError ?? woError}
            </span>
          ) : savedAt ? (
            <span style={{ fontSize: 12, color: '#15803d' }}>
              ✓ Saved {savedAt.toLocaleTimeString()}
            </span>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {items.length} line item{items.length !== 1 ? 's' : ''} · ${total.toFixed(2)} total
            </span>
          )}
        </div>

        {/* Present to Customer — only when estimate hasn't been decided yet */}
        {status !== 'approved' && status !== 'declined' && (
          <button
            type="button"
            disabled={presenting || saving}
            onClick={handlePresent}
            style={{
              fontSize: 12, fontWeight: 700, padding: '8px 14px',
              borderRadius: 'var(--r8,8px)',
              border: 'none', cursor: (presenting || saving) ? 'default' : 'pointer',
              background: presenting ? '#15803d' : 'linear-gradient(135deg, #16a34a, #15803d)',
              color: '#fff',
              opacity: (presenting || saving) ? 0.7 : 1,
              transition: 'all 0.15s',
              boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
            }}
          >
            {presenting ? 'Presenting…' : '📋 Send to Customer for Approval'}
          </button>
        )}

        {/* Reopen Authorization Button — shown when estimate is authorized or approved (Phase 2).
            Allows reopening authorization to change customer decisions again.
            Shows warning if work order exists (will be out of sync). */}
        {(estimate.status === 'authorized' || estimate.status === 'approved') && (
          <button
            type="button"
            disabled={saving || presenting}
            onClick={async () => {
              try {
                const { reopenEstimateAuthorization } = await import('./actions')
                await reopenEstimateAuthorization(estimate.id)
                router.refresh()
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to reopen authorization'
                alert(message)
              }
            }}
            title={woResult ? 'Reopen authorization — existing work order will be out of sync' : 'Reopen authorization to change customer decisions'}
            style={{
              fontSize: 12, fontWeight: 700, padding: '8px 14px',
              borderRadius: 'var(--r8,8px)',
              border: '1px solid #f59e0b',
              background: '#fffbeb',
              color: '#92400e',
              cursor: (saving || presenting) ? 'default' : 'pointer',
              opacity: (saving || presenting) ? 0.6 : 1,
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            ↺ Reopen Authorization
          </button>
        )}

        {/* Work Order Button — shown when estimate is authorized (Phase 1).
            Idempotent: clicking again returns the existing WO, never creates a duplicate.
            woLoading: true while checking if work order already exists.
            Hidden when reopened (Phase 2) to prevent creating additional work orders. */}
        {estimate.status === 'authorized' && !woLoading && estimate.status !== 'reopened' && (
          <button
            type="button"
            disabled={woCreating || saving || presenting}
            onClick={handleCreateWorkOrder}
            title={
              woResult
                ? `View work order ${woResult.work_order_number ?? woResult.id}`
                : `Create work order from ${decisionApprovedCount} approved item${decisionApprovedCount !== 1 ? 's' : ''}`
            }
            style={{
              fontSize: 12, fontWeight: 700, padding: '8px 14px',
              borderRadius: 'var(--r8,8px)',
              border: 'none',
              cursor: (woCreating || saving || presenting) ? 'default' : 'pointer',
              background: woResult
                ? '#1d4ed8'
                : woCreating
                ? '#1d4ed8'
                : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#fff',
              opacity: (woCreating || saving || presenting) ? 0.7 : 1,
              transition: 'all 0.15s',
              boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            {woCreating
              ? 'Creating…'
              : woResult
              ? `🔧 View Work Order ↗`
              : '🔧 Create Work Order'}
          </button>
        )}

        {/* Preview — links to the advisor presentation view */}
        <a
          href={`/dashboard/estimates/${estimate.id}/present`}
          style={{
            fontSize: 12, fontWeight: 700, padding: '8px 14px',
            borderRadius: 'var(--r8,8px)',
            border: '1px solid #cbd5e1',
            background: '#fff',
            color: '#1e293b',
            textDecoration: 'none',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          Review (Internal) ↗
        </a>

        <button
          type="button"
          className="btn-primary"
          disabled={saving || presenting}
          style={{ opacity: (saving || presenting) ? 0.6 : 1 }}
          onClick={handleSave}
        >
          {saving ? 'Saving…' : 'Save Estimate'}
        </button>

        <a href={backHref} className="btn-ghost" style={{ fontSize: 12 }}>
          ← Back
        </a>

        {/* Void Estimate — destructive, always available in the save bar */}
        <button
          type="button"
          className="btn-danger"
          style={{ fontSize: 12 }}
          onClick={openVoidModal}
          title="Void this estimate and remove it from active lists"
        >
          Void Estimate
        </button>
      </div>

      {/* ── Void confirmation modal ───────────────────────────────────────────── */}
      <ArchiveConfirmModal
        isOpen={voidOpen}
        onClose={() => { setVoidOpen(false); setVoidError(null) }}
        entityType="estimate"
        entityLabel={estimate.estimate_number}
        actionLabel="Void"
        warningTier={voidTier}
        warningText={voidWarning}
        reasonOptions={VOID_REASONS}
        onConfirm={handleVoidConfirm}
        isSubmitting={voidSubmit}
        errorMessage={voidError}
      />

      {/* ── Delete line item confirmation modal ───────────────────────────────── */}
      {deleteConfirmOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 12, padding: 24,
            maxWidth: 420, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{
              fontSize: 18, fontWeight: 700, marginBottom: 12,
              color: 'var(--text)',
            }}>
              Remove Line Item?
            </h3>
            <p style={{
              fontSize: 14, color: 'var(--text-2)', marginBottom: 24,
              lineHeight: 1.5,
            }}>
              This line item will be removed from the estimate. You can recreate it later if needed.
            </p>
            <div style={{
              display: 'flex', gap: 12, justifyContent: 'flex-end',
            }}>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false)
                  setDeleteConfirmKey(null)
                }}
                style={{
                  fontSize: 12, fontWeight: 600, padding: '8px 16px',
                  borderRadius: 6, border: '1px solid var(--border-2)',
                  background: 'var(--surface-2)', color: 'var(--text)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--border-2)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmKey) {
                    removeItem(deleteConfirmKey)
                  }
                  setDeleteConfirmOpen(false)
                  setDeleteConfirmKey(null)
                }}
                style={{
                  fontSize: 12, fontWeight: 600, padding: '8px 16px',
                  borderRadius: 6, border: 'none',
                  background: '#dc2626', color: '#fff',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#b91c1c'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#dc2626'
                }}
              >
                Remove Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface ItemRowProps {
  item:             LocalItem
  jobGroups:        JobGroup[]
  serviceJobs:      ServiceJobWithCategory[]
  defaultLaborRate: number
  onUpdate:         (field: Partial<LocalItem>) => void
  onRemove:         () => void
  onRequestRemove?: () => void  // Called instead of onRemove to show confirmation
  onAddPart:        () => void
  onRemovePart:     (partKey: string) => void
  onUpdatePart:     (partKey: string, field: Partial<LocalPart>) => void
  decisionStatus?:  'approved' | 'declined' | 'pending'  // Status badge
}

function ItemRow({
  item,
  jobGroups,
  serviceJobs,
  defaultLaborRate,
  onUpdate,
  onRemove,
  onRequestRemove,
  onAddPart,
  onRemovePart,
  onUpdatePart,
  decisionStatus,
}: ItemRowProps) {
  const isJobMode   = !!item.service_job_id
  // Manual labor items also use hours × rate (no service catalog needed)
  const isLaborMode = isJobMode || item.category === 'labor'
  const lineTotal   = getLineTotal(item)
  const laborTotal  = round2(item.labor_hours * item.labor_rate)

  function handleJobChange(jobId: string) {
    if (!jobId) {
      // Revert to manual — clear job-specific fields
      onUpdate({ service_job_id: null })
      return
    }
    const job = serviceJobs.find(j => j.id === jobId)
    if (!job) return
    onUpdate({
      service_job_id: jobId,
      title:          job.name,
      category:       'labor',
      labor_hours:    Number(job.default_labor_hours ?? 1),
      labor_rate:     defaultLaborRate || 0,
    })
  }

  const partsSubtotal = getItemPartsTotal(item.parts)
  // For labor mode items: Job Subtotal = labor + parts (lineTotal alone doesn't include parts for manual labor)
  const jobSubtotal = isLaborMode ? round2(laborTotal + partsSubtotal) : lineTotal

  return (
    <div style={{
      background: 'var(--surface-2,#f8fafc)',
      border: '1px solid var(--border-2)',
      borderRadius: 8,
      padding: '10px 12px',
    }}>

      {/* ── Row 1: Job / mode selector + status badge ─────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <select
          value={item.service_job_id ?? ''}
          onChange={e => handleJobChange(e.target.value)}
          className="field-input"
          style={{ flex: 1, fontSize: 12, padding: '4px 8px' }}
        >
          <option value="">— Manual Entry —</option>
          {jobGroups.map(group => (
            <optgroup key={group.categoryName} label={group.categoryName}>
              {group.jobs.map(job => (
                <option key={job.id} value={job.id}>
                  {job.name}
                  {job.default_labor_hours ? ` (${job.default_labor_hours}h)` : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Status badge — shows current approval state */}
        {decisionStatus && (
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            padding: '4px 8px', borderRadius: 4,
            background:
              decisionStatus === 'approved' ? '#dcfce7' :
              decisionStatus === 'declined' ? '#fee2e2' :
              '#f3f4f6',
            color:
              decisionStatus === 'approved' ? '#15803d' :
              decisionStatus === 'declined' ? '#dc2626' :
              '#6b7280',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {decisionStatus === 'pending' ? '◯ NEEDS REVIEW' : `✓ ${decisionStatus.toUpperCase()}`}
          </span>
        )}
      </div>

      {/* ── Row 2 Footer: Item actions (delete) ────────────────────────────────── */}
      {/* Separated from status badge to avoid accidental deletion */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: 8,
        paddingTop: 8, borderTop: '1px solid var(--border-3, #e5e7eb)',
        marginTop: 8, marginBottom: -10, marginLeft: -12, marginRight: -12,
        paddingLeft: 12, paddingRight: 12, paddingBottom: 8,
      }}>
        <button
          type="button"
          onClick={() => {
            if (onRequestRemove) {
              onRequestRemove()
            }
          }}
          title="Delete this line item from the estimate"
          style={{
            fontSize: 11, fontWeight: 600,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#dc2626', padding: '4px 8px',
            borderRadius: 4, transition: 'background 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220, 38, 38, 0.1)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'none'
          }}
        >
          🗑 Delete Item
        </button>
      </div>

      {isLaborMode ? (
        // ── Labor / Job layout: two-column (left: editing, right: breakdown) ──
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>

          {/* LEFT — main editing area */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Category (manual only) + Title + Description */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
              {!isJobMode && (
                <select
                  value={item.category}
                  onChange={e => {
                    const newCat = e.target.value as Category
                    const patch: Partial<LocalItem> = { category: newCat }
                    if (newCat === 'labor') {
                      if (!item.labor_hours) patch.labor_hours = 1
                      if (!item.labor_rate && defaultLaborRate > 0) patch.labor_rate = defaultLaborRate
                    }
                    onUpdate(patch)
                  }}
                  className="field-input"
                  style={{ width: 90, fontSize: 12, padding: '4px 6px', flexShrink: 0 }}
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              )}

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input
                  type="text"
                  value={item.title}
                  onChange={e => onUpdate({ title: e.target.value })}
                  placeholder={isJobMode ? 'Job title' : 'Item name'}
                  className="field-input"
                  style={{ fontSize: 13, padding: '4px 8px', width: '100%' }}
                />
                <input
                  type="text"
                  value={item.description}
                  onChange={e => onUpdate({ description: e.target.value })}
                  placeholder="Description (optional)"
                  className="field-input"
                  style={{ fontSize: 11, padding: '3px 8px', width: '100%', color: 'var(--text-3)' }}
                />
              </div>

              {item.needs_review && (
                <span style={{
                  fontSize: 10, fontWeight: 600, color: '#92400e',
                  padding: '2px 6px', borderRadius: 3,
                  background: '#fffbeb', alignSelf: 'center', flexShrink: 0,
                }}>
                  Needs Review
                </span>
              )}
            </div>

            {/* Labor hours — advisor enters hours only; rate comes from shop settings */}
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center',
              marginBottom: 8,
            }}>
              <label style={{
                fontSize: 12, fontWeight: 600,
                color: 'var(--text-2)', whiteSpace: 'nowrap',
              }}>
                Labor
              </label>
              <input
                type="number"
                min="0"
                step="0.25"
                value={item.labor_hours}
                onChange={e => onUpdate({ labor_hours: parseFloat(e.target.value) || 0 })}
                className="field-input"
                style={{ width: 70, fontSize: 12, padding: '4px 6px', textAlign: 'right' }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                hrs&nbsp;&nbsp;@&nbsp;${item.labor_rate.toFixed(2)}/hr
              </span>
            </div>

            {/* Nested parts */}
            <PartsSection
              parts={item.parts}
              onAdd={onAddPart}
              onRemove={onRemovePart}
              onUpdate={onUpdatePart}
            />

            {/* Line item notes */}
            <input
              type="text"
              value={item.item_notes}
              onChange={e => onUpdate({ item_notes: e.target.value })}
              placeholder="Line item notes (optional)"
              className="field-input"
              style={{ fontSize: 11, padding: '3px 8px', width: '100%', color: 'var(--text-3)', marginTop: 8 }}
            />
          </div>

          {/* RIGHT — job cost breakdown panel */}
          <div style={{
            minWidth: 164, flexShrink: 0,
            background: 'var(--surface,#fff)',
            border: '1px solid var(--border-2)',
            borderRadius: 6,
            padding: '10px 12px',
          }}>
            <TotalRow label="Labor Cost"     amount={laborTotal} />
            <TotalRow label="Parts Subtotal" amount={partsSubtotal} />
            <div style={{
              borderTop: '1px solid var(--border-2)',
              marginTop: 6, paddingTop: 6,
            }}>
              <TotalRow label="Job Subtotal" amount={jobSubtotal} bold />
            </div>
          </div>
        </div>

      ) : (
        // ── Non-labor layout: fee / misc — simple qty × price ────────────────
        <>
          {/* Category + Title + Description */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
            <select
              value={item.category}
              onChange={e => {
                const newCat = e.target.value as Category
                const patch: Partial<LocalItem> = { category: newCat }
                if (newCat === 'labor') {
                  if (!item.labor_hours) patch.labor_hours = 1
                  if (!item.labor_rate && defaultLaborRate > 0) patch.labor_rate = defaultLaborRate
                }
                onUpdate(patch)
              }}
              className="field-input"
              style={{ width: 90, fontSize: 12, padding: '4px 6px', flexShrink: 0 }}
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <input
                type="text"
                value={item.title}
                onChange={e => onUpdate({ title: e.target.value })}
                placeholder="Item name"
                className="field-input"
                style={{ fontSize: 13, padding: '4px 8px', width: '100%' }}
              />
              <input
                type="text"
                value={item.description}
                onChange={e => onUpdate({ description: e.target.value })}
                placeholder="Description (optional)"
                className="field-input"
                style={{ fontSize: 11, padding: '3px 8px', width: '100%', color: 'var(--text-3)' }}
              />
            </div>

            {item.needs_review && (
              <span style={{
                fontSize: 10, fontWeight: 600, color: '#92400e',
                padding: '2px 6px', borderRadius: 3,
                background: '#fffbeb', alignSelf: 'center', flexShrink: 0,
              }}>
                Needs Review
              </span>
            )}
          </div>

          {/* Qty × unit price */}
          <div style={{
            display: 'flex', gap: 10, alignItems: 'center',
            flexWrap: 'wrap', marginBottom: 8,
          }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Qty</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={item.quantity}
                onChange={e => onUpdate({ quantity: parseFloat(e.target.value) || 0 })}
                className="field-input"
                style={{ width: 70, fontSize: 12, padding: '4px 6px', textAlign: 'right' }}
              />
            </div>

            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>×</span>

            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.unit_price}
                onChange={e => onUpdate({ unit_price: parseFloat(e.target.value) || 0 })}
                className="field-input"
                style={{ width: 100, fontSize: 12, padding: '4px 6px', textAlign: 'right' }}
              />
            </div>

            <div style={{
              fontFamily: 'var(--font-mono)', fontWeight: 700,
              fontSize: 13, color: 'var(--text)', marginLeft: 'auto', whiteSpace: 'nowrap',
            }}>
              ${lineTotal.toFixed(2)}
            </div>
          </div>

          {/* Notes */}
          <input
            type="text"
            value={item.item_notes}
            onChange={e => onUpdate({ item_notes: e.target.value })}
            placeholder="Line item notes (optional)"
            className="field-input"
            style={{ fontSize: 11, padding: '3px 8px', width: '100%', color: 'var(--text-3)' }}
          />
        </>
      )}
    </div>
  )
}

// ── PartsSection sub-component ────────────────────────────────────────────────

interface PartsSectionProps {
  parts:    LocalPart[]
  onAdd:    () => void
  onRemove: (partKey: string) => void
  onUpdate: (partKey: string, field: Partial<LocalPart>) => void
}

function PartsSection({ parts, onAdd, onRemove, onUpdate }: PartsSectionProps) {
  // Columns: Part Name | Part # | Qty | Part Cost | Sell $ (auto) | Part Subtotal (auto) | ✕
  // Advisor enters: name, part_number, qty, unit_cost.
  // Sell price and part subtotal are auto-calculated from Parts Markup % — not editable.
  const COLS = '1fr 96px 52px 80px 72px 82px 28px'

  return (
    <div style={{
      marginTop: 8,
      borderTop: '1px dashed var(--border-2)',
      paddingTop: 8,
    }}>

      {parts.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: COLS,
          gap: 4, marginBottom: 4, padding: '0 2px',
        }}>
          {['Part Name', 'Part #', 'Qty', 'Part Cost', 'Sell $', 'Part Subtotal', ''].map((h, i) => (
            <span key={i} style={{
              fontSize: 10, fontWeight: 600, color: 'var(--text-3)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              textAlign: i >= 2 ? 'right' : 'left',
            }}>
              {h}
            </span>
          ))}
        </div>
      )}

      {parts.map(part => (
        <div key={part._key} style={{
          display: 'grid', gridTemplateColumns: COLS,
          gap: 4, marginBottom: 4, alignItems: 'center',
        }}>

          {/* Part name — editable */}
          <input
            type="text"
            value={part.name}
            onChange={e => onUpdate(part._key, { name: e.target.value })}
            placeholder="Part name"
            className="field-input"
            style={{ fontSize: 12, padding: '3px 6px' }}
          />

          {/* Part number / SKU — editable */}
          <input
            type="text"
            value={part.part_number}
            onChange={e => onUpdate(part._key, { part_number: e.target.value })}
            placeholder="Part #"
            className="field-input"
            style={{ fontSize: 12, padding: '3px 6px' }}
          />

          {/* Quantity — editable */}
          <input
            type="number"
            min="0"
            step="1"
            value={part.quantity}
            onChange={e => onUpdate(part._key, { quantity: parseFloat(e.target.value) || 0 })}
            className="field-input"
            style={{ fontSize: 12, padding: '3px 6px', textAlign: 'right' }}
          />

          {/* Unit cost — editable */}
          <input
            type="number"
            min="0"
            step="0.01"
            value={part.unit_cost}
            onChange={e => onUpdate(part._key, { unit_cost: parseFloat(e.target.value) || 0 })}
            className="field-input"
            style={{ fontSize: 12, padding: '3px 6px', textAlign: 'right' }}
          />

          {/* Sell price — read-only, auto-computed via Parts Markup % */}
          <div style={{
            fontSize: 12, textAlign: 'right',
            fontFamily: 'var(--font-mono)', color: 'var(--text-2)',
            padding: '3px 4px',
          }}>
            ${part.unit_sell_price.toFixed(2)}
          </div>

          {/* Part subtotal — read-only, qty × sell price */}
          <div style={{
            fontSize: 12, fontWeight: 600, textAlign: 'right',
            fontFamily: 'var(--font-mono)', color: 'var(--text)',
            padding: '3px 4px',
          }}>
            ${part.line_total.toFixed(2)}
          </div>

          <button
            type="button"
            onClick={() => onRemove(part._key)}
            title="Remove part"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--text-3)', padding: '2px',
              lineHeight: 1, textAlign: 'center',
            }}
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={onAdd}
        style={{
          fontSize: 11, fontWeight: 600,
          color: 'var(--text-3)', background: 'none', border: 'none',
          cursor: 'pointer', padding: '2px 0', marginTop: 2,
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add Parts
      </button>
    </div>
  )
}

// ── TotalRow sub-component ────────────────────────────────────────────────────

function TotalRow({
  label, amount, bold = false,
}: { label: string; amount: number; bold?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', padding: '3px 0',
    }}>
      <span style={{
        fontSize: bold ? 13 : 12,
        fontWeight: bold ? 700 : 400,
        color: bold ? 'var(--text)' : 'var(--text-3)',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: bold ? 13 : 12,
        fontWeight: bold ? 700 : 500,
        color: 'var(--text)',
        fontFamily: 'var(--font-mono)',
      }}>
        ${amount.toFixed(2)}
      </span>
    </div>
  )
}
