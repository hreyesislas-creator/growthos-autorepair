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
  { value: 'draft',    label: 'Draft',    style: { background: '#f1f5f9', color: '#475569' } },
  { value: 'sent',     label: 'Sent',     style: { background: '#eff6ff', color: '#1d4ed8' } },
  { value: 'approved', label: 'Approved', style: { background: '#f0fdf4', color: '#15803d' } },
  { value: 'declined', label: 'Declined', style: { background: '#fff7ed', color: '#c2410c' } },
] as const

type Category = 'labor' | 'part' | 'fee' | 'misc'
type Status   = 'draft' | 'sent' | 'approved' | 'declined'

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
    setItems(prev =>
      prev.map(item => ({
        ...item,
        parts: item.parts.map(p => computePart(p, partsMarkupPercent)),
      })),
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partsMarkupPercent])

  // ── Async state ────────────────────────────────────────────────────────────
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState<string | null>(null)
  const [savedAt,    setSavedAt]    = useState<Date | null>(null)

  // ── Present to customer state ─────────────────────────────────────────────
  const [presenting,   setPresenting]   = useState(false)
  const [presentError, setPresentError] = useState<string | null>(null)
  // Show the share link once presented OR if the estimate is already sent/approved/declined
  const [shareVisible, setShareVisible] = useState(
    () => ['sent', 'approved', 'declined'].includes(estimate.status),
  )
  const [copied, setCopied] = useState(false)

  // ── Work order creation state ─────────────────────────────────────────────
  const [woCreating, setWoCreating] = useState(false)
  const [woError,    setWoError]    = useState<string | null>(null)
  // Populated once a work order is successfully created or found (idempotent)
  const [woResult,   setWoResult]   = useState<{ id: string; work_order_number: string | null } | null>(null)

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
  // Show the summary bar if the estimate has been presented (status = 'sent')
  // OR if any decisions already exist (handles manual status overrides gracefully).
  const showDecisionSummary =
    estimate.status === 'sent' || initialDecisions.length > 0

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
          const merged = { ...p, ...field }
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

    // Build items payload — parts_total pre-computed from local parts
    const itemsPayload: EstimateItemInput[] = items.map((i, idx) => {
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
    items.forEach((localItem, idx) => {
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

    // Build items payload — parts_total pre-computed from local parts
    const itemsPayload: EstimateItemInput[] = items.map((i, idx) => {
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
    items.forEach((localItem, idx) => {
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
      status:               'sent',
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
    setStatus('sent')
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
    } else if (estimate.status === 'sent') {
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
            {items.map(item => (
              <ItemRow
                key={item._key}
                item={item}
                jobGroups={jobGroups}
                serviceJobs={serviceJobs}
                defaultLaborRate={defaultLaborRate}
                onUpdate={field => updateItem(item._key, field)}
                onRemove={() => removeItem(item._key)}
                onAddPart={() => addPart(item._key)}
                onRemovePart={partKey => removePart(item._key, partKey)}
                onUpdatePart={(partKey, field) => updatePart(item._key, partKey, field)}
              />
            ))}
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

      {/* ── Totals + tax ───────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: 'var(--text-3)',
          paddingBottom: 10, borderBottom: '1px solid var(--border-2)',
          marginBottom: 12,
        }}>
          Totals
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
                : 'Estimate sent — share this link with your customer'}
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
            {presenting ? 'Presenting…' : '📋 Present to Customer'}
          </button>
        )}

        {/* Create Work Order — shown when at least one item is approved.
            Idempotent: clicking again returns the existing WO, never creates a duplicate. */}
        {decisionApprovedCount > 0 && (
          <button
            type="button"
            disabled={woCreating || saving || presenting}
            onClick={handleCreateWorkOrder}
            title={
              woResult
                ? `Work order ${woResult.work_order_number ?? ''} already created`
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
              ? `🔧 ${woResult.work_order_number ?? 'Work Order'} ↗`
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
          Preview ↗
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
  onAddPart:        () => void
  onRemovePart:     (partKey: string) => void
  onUpdatePart:     (partKey: string, field: Partial<LocalPart>) => void
}

function ItemRow({
  item,
  jobGroups,
  serviceJobs,
  defaultLaborRate,
  onUpdate,
  onRemove,
  onAddPart,
  onRemovePart,
  onUpdatePart,
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

  return (
    <div style={{
      background: 'var(--surface-2,#f8fafc)',
      border: '1px solid var(--border-2)',
      borderRadius: 8,
      padding: '10px 12px',
    }}>

      {/* ── Row 1: Job / mode selector + remove ─────────────────────────────── */}
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

        <button
          type="button"
          onClick={onRemove}
          title="Remove item"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, color: 'var(--text-3)', padding: '4px 6px',
            lineHeight: 1, flexShrink: 0,
          }}
        >
          ✕
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
              <TotalRow label="Job Subtotal" amount={lineTotal} bold />
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
