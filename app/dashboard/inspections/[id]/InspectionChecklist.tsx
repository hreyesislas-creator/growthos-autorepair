'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type {
  Inspection,
  InspectionTemplateItem,
  ServiceRecommendation,
  TenantUser,
} from '@/lib/types'
import {
  saveInspectionResults,
  completeInspection,
  reopenInspection,
  updateRecommendationStatus,
  generateRecommendations,
  type RecommendationStatus,
} from '../actions'

// ── Types ──────────────────────────────────────────────────────────────────────

/**
 * UI-side status values — what the buttons display and what itemState stores.
 * These are intentionally different from the DB column values.
 * Use dbToUi() / uiToDb() to translate at the boundary.
 *
 * DB values  →  UI values
 * pass       →  ok
 * attention  →  warning
 * urgent     →  critical
 * not_checked→  nc
 */
type ItemResult = 'ok' | 'warning' | 'critical' | 'nc'

/** DB column values stored in inspection_items.status */
type DbStatus = 'pass' | 'attention' | 'urgent' | 'not_checked'

interface ItemState {
  result: ItemResult
  note:   string
}

interface Section {
  section_name: string
  items:        InspectionTemplateItem[]
}

interface ExistingItem {
  template_item_id: string | null
  /** Raw value from DB — may be DbStatus or any legacy string */
  status:           string | null
  notes:            string | null
}

interface Props {
  inspection:             Inspection
  sections:               Section[]
  existingItems:          ExistingItem[]
  initialRecommendations: ServiceRecommendation[]
  technician?:            TenantUser | null
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: {
  value:       ItemResult
  label:       string
  activeStyle: React.CSSProperties
}[] = [
  { value: 'ok',       label: 'OK',       activeStyle: { background: '#16a34a', color: '#fff', borderColor: '#16a34a' } },
  { value: 'warning',  label: 'Warning',  activeStyle: { background: '#d97706', color: '#fff', borderColor: '#d97706' } },
  { value: 'critical', label: 'Critical', activeStyle: { background: '#dc2626', color: '#fff', borderColor: '#dc2626' } },
  { value: 'nc',       label: 'N/C',      activeStyle: { background: 'var(--surface-3,#e5e7eb)', color: 'var(--text-3)', borderColor: 'var(--border)' } },
]

const STATUS_SUMMARY_COLOR: Record<ItemResult, string> = {
  ok:       '#16a34a',
  warning:  '#d97706',
  critical: '#dc2626',
  nc:       'var(--text-3)',
}

const REC_DECISION_OPTIONS: {
  value:       RecommendationStatus
  label:       string
  activeStyle: React.CSSProperties
}[] = [
  { value: 'accepted', label: '✓ Accept',  activeStyle: { background: '#16a34a', color: '#fff', borderColor: '#16a34a' } },
  { value: 'rejected', label: '✕ Reject',  activeStyle: { background: '#dc2626', color: '#fff', borderColor: '#dc2626' } },
  { value: 'pending',  label: '· Pending', activeStyle: { background: '#d97706', color: '#fff', borderColor: '#d97706' } },
]

const REC_STATUS_LABEL: Record<string, { label: string; style: React.CSSProperties }> = {
  accepted: { label: 'Accepted', style: { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' } },
  rejected: { label: 'Rejected', style: { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' } },
  pending:  { label: 'Pending',  style: { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' } },
  open:     { label: 'Open',     style: { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' } },
}

const SOURCE_STATUS_BADGE: Record<'attention' | 'urgent', { label: string; style: React.CSSProperties }> = {
  attention: { label: 'Warning',  style: { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' } },
  urgent:    { label: 'Critical', style: { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' } },
}

// ── Status mapping ─────────────────────────────────────────────────────────────
//
// The DB stores:   'pass' | 'attention' | 'urgent' | 'not_checked'
// The UI renders:  'ok'   | 'warning'   | 'critical'| 'nc'
//
// These two functions are the only place the translation happens.
// Every read from DB goes through dbToUi().
// Every write to DB goes through uiToDb().
//

function dbToUi(dbStatus: string | null | undefined): ItemResult {
  switch (dbStatus) {
    case 'pass':        return 'ok'
    case 'attention':   return 'warning'
    case 'urgent':      return 'critical'
    case 'not_checked': return 'nc'
    // Defensive: handle any value already in UI form (idempotent)
    case 'ok':          return 'ok'
    case 'warning':     return 'warning'
    case 'critical':    return 'critical'
    case 'nc':          return 'nc'
    default:            return 'nc'
  }
}

function uiToDb(uiStatus: ItemResult): DbStatus {
  switch (uiStatus) {
    case 'ok':       return 'pass'
    case 'warning':  return 'attention'
    case 'critical': return 'urgent'
    case 'nc':       return 'not_checked'
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildInitialState(
  sections:      Section[],
  existingItems: ExistingItem[],
): Record<string, ItemState> {
  const state: Record<string, ItemState> = {}

  // Index saved DB items by template_item_id for O(1) lookup
  const existingMap = new Map<string, ExistingItem>()
  for (const ei of existingItems) {
    if (ei.template_item_id) existingMap.set(ei.template_item_id, ei)
  }

  for (const section of sections) {
    for (const item of section.items) {
      const existing = existingMap.get(item.id)
      const result   = dbToUi(existing?.status)

      state[item.id] = {
        result,
        note: existing?.notes ?? '',
      }
    }
  }

  return state
}

/**
 * Derive a stable string key from existingItems content.
 * Changes when any item's status, notes, or set of IDs changes — but
 * does NOT change when the user makes local edits (since it comes from props).
 * Used as a useEffect dependency to sync state when the server sends new data.
 */
function getExistingItemsKey(existingItems: ExistingItem[]): string {
  return existingItems
    .map(ei => `${ei.template_item_id ?? ''}:${ei.status}:${ei.notes ?? ''}`)
    .sort()
    .join('|')
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InspectionChecklist({
  inspection,
  sections,
  existingItems,
  initialRecommendations,
  technician,
}: Props) {
  const router = useRouter()

  // ── Checklist state ────────────────────────────────────────────────────────
  const [itemState, setItemState] = useState<Record<string, ItemState>>(
    () => buildInitialState(sections, existingItems),
  )
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(() => {
    // Auto-expand notes that already have saved content
    const withNotes = new Set<string>()
    for (const ei of existingItems) {
      if (ei.template_item_id && ei.notes?.trim()) {
        withNotes.add(ei.template_item_id)
      }
    }
    return withNotes
  })

  // ── Sync state from server data ────────────────────────────────────────────
  //
  // Root cause of rehydration bug (original):
  //   useState lazy initializer only runs on mount — never when props change.
  //   Next.js Router Cache can serve a stale RSC payload (existingItems=[]) on
  //   back-navigation, so the component mounts with empty items even when the DB
  //   has data.  After router.refresh() the server sends correct items as updated
  //   props, but useState doesn't reinitialize.
  //
  // Fix: watch existingItemsKey (content-hash of prop) and reinitialize
  //   itemState whenever the SERVER sends genuinely new data.  Guard:
  //   if existingItems is empty we skip — we never want to wipe saved state.
  //
  const existingItemsKey = useMemo(
    () => getExistingItemsKey(existingItems),
    [existingItems],
  )

  useEffect(() => {
    // Never reinitialize from an empty list — DB data always wins over cache
    if (existingItems.length === 0) return

    // Reinitialize checklist state to match whatever the server just sent
    setItemState(buildInitialState(sections, existingItems))

    // Auto-expand notes that have saved content
    setExpandedNotes(new Set(
      existingItems
        .filter(ei => ei.template_item_id && ei.notes?.trim())
        .map(ei => ei.template_item_id as string),
    ))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingItemsKey])

  // ── Action state ───────────────────────────────────────────────────────────
  const [saving,      setSaving]      = useState(false)
  const [completing,  setCompleting]  = useState(false)
  const [reopening,   setReopening]   = useState(false)
  const [generating,  setGenerating]  = useState(false)
  const [saveResult,  setSaveResult]  = useState<'idle' | 'success' | 'error'>('idle')
  const [saveError,   setSaveError]   = useState<string | null>(null)
  const [genError,    setGenError]    = useState<string | null>(null)

  // ── Recommendation decision state (optimistic) ─────────────────────────────
  const [recStatuses, setRecStatuses] = useState<Record<string, RecommendationStatus>>(
    () => Object.fromEntries(initialRecommendations.map(r => [r.id, r.status as RecommendationStatus]))
  )
  const [recErrors, setRecErrors] = useState<Record<string, string>>({})

  // ── Completion state (local) ────────────────────────────────────────────────
  //
  // We manage the completed/in-progress toggle locally rather than reading from
  // the inspection prop.  This prevents router.refresh() (called after handleSave)
  // from momentarily delivering a stale inspection.status and flipping isReadOnly
  // at the wrong time.  completeInspection/reopenInspection only toggle this flag
  // and do NOT call router.refresh(), so the checklist and recommendations are
  // never wiped by those actions.
  //
  const [isCompletedLocal, setIsCompletedLocal] = useState<boolean>(
    () => inspection.status === 'completed',
  )
  const isReadOnly = isCompletedLocal

  // ── Derived values ─────────────────────────────────────────────────────────

  const counts = useMemo(() => {
    const acc = { ok: 0, warning: 0, critical: 0, nc: 0, total: 0 }
    for (const s of Object.values(itemState)) { acc[s.result]++; acc.total++ }
    return acc
  }, [itemState])

  const checkedCount = counts.total - counts.nc
  const progressPct  = counts.total > 0 ? Math.round((checkedCount / counts.total) * 100) : 0

  // Label lookup built once from sections
  const labelMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const section of sections) {
      for (const item of section.items) {
        map.set(item.id, item.label || item.item_name || item.id)
      }
    }
    return map
  }, [sections])

  // ── Checklist handlers ─────────────────────────────────────────────────────

  function setResult(itemId: string, result: ItemResult) {
    if (isReadOnly) return
    setSaveResult('idle')
    setItemState(prev => ({ ...prev, [itemId]: { ...prev[itemId], result } }))
  }

  function setNote(itemId: string, note: string) {
    if (isReadOnly) return
    setItemState(prev => ({ ...prev, [itemId]: { ...prev[itemId], note } }))
  }

  function toggleNote(itemId: string) {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      next.has(itemId) ? next.delete(itemId) : next.add(itemId)
      return next
    })
  }

  // ── Save handler ───────────────────────────────────────────────────────────

  async function handleSave() {
    if (isReadOnly) return
    setSaving(true)
    setSaveResult('idle')
    setSaveError(null)

    const payload = Object.entries(itemState).map(([templateItemId, s]) => ({
      template_item_id: templateItemId,
      // Translate UI value → DB value before persisting
      status:           uiToDb(s.result),
      notes:            s.note.trim() || null,
      label:            labelMap.get(templateItemId) ?? '',
    }))

    const result = await saveInspectionResults(inspection.id, payload)
    setSaving(false)

    if (result?.error) {
      setSaveResult('error')
      setSaveError(result.error)
      return
    }

    setSaveResult('success')
    router.refresh()
  }

  // ── Complete / reopen handlers ─────────────────────────────────────────────

  async function handleComplete() {
    setCompleting(true)
    setSaveResult('idle')
    setSaveError(null)

    const result = await completeInspection(inspection.id)
    setCompleting(false)

    if (result?.error) {
      setSaveResult('error')
      setSaveError(result.error)
      return
    }

    setIsCompletedLocal(true)
    router.refresh()
  }

  async function handleReopen() {
    setReopening(true)
    setSaveResult('idle')
    setSaveError(null)

    const result = await reopenInspection(inspection.id)
    setReopening(false)

    if (result?.error) {
      setSaveResult('error')
      setSaveError(result.error)
      return
    }

    setIsCompletedLocal(false)
    router.refresh()
  }

  // ── Generate recommendations handler ──────────────────────────────────────

  async function handleGenerate() {
    setGenerating(true)
    setGenError(null)

    const result = await generateRecommendations(inspection.id)
    setGenerating(false)

    if (result?.error) {
      setGenError(result.error)
      return
    }

    // Refresh so the server sends the newly generated recommendations
    router.refresh()
  }

  // ── Recommendation decision handler (optimistic) ───────────────────────────

  async function handleRecDecision(recId: string, newStatus: RecommendationStatus) {
    const previous = recStatuses[recId]
    setRecStatuses(prev => ({ ...prev, [recId]: newStatus }))
    setRecErrors(prev => ({ ...prev, [recId]: '' }))

    const result = await updateRecommendationStatus(recId, newStatus)

    if (result?.error) {
      setRecStatuses(prev => ({ ...prev, [recId]: previous }))
      setRecErrors(prev => ({ ...prev, [recId]: result.error }))
    }
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (sections.length === 0) {
    return (
      <div className="dash-content">
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div className="section-title" style={{ marginBottom: 8 }}>No checklist items</div>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
            This inspection has no template assigned, or the template has no items yet.
          </p>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="dash-content">

      {/* ── Completed banner ──────────────────────────────────────────────── */}
      {isReadOnly && (
        <div style={{
          marginBottom: 16, padding: '12px 16px',
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 'var(--r8, 8px)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#15803d' }}>
            Inspection completed — checklist is read-only.
          </div>
          <button
            type="button"
            className="btn-ghost"
            disabled={reopening}
            style={{ fontSize: 12, opacity: reopening ? 0.6 : 1 }}
            onClick={handleReopen}
          >
            {reopening ? 'Reopening…' : 'Edit Inspection'}
          </button>
        </div>
      )}

      {/* ── Save result banners ───────────────────────────────────────────── */}
      {saveResult === 'success' && (
        <div style={{
          marginBottom: 16, padding: '12px 16px',
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 'var(--r8, 8px)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>Progress saved.</span>
          <span style={{ fontSize: 13, color: '#166534', marginLeft: 2 }}>
            {counts.critical > 0
              ? `${counts.critical} critical item${counts.critical !== 1 ? 's' : ''} flagged.`
              : `${checkedCount} of ${counts.total} items reviewed.`}
          </span>
        </div>
      )}

      {saveResult === 'error' && saveError && (
        <div style={{
          marginBottom: 16, padding: '12px 16px',
          background: '#fff0f0', border: '1px solid #fca5a5',
          borderRadius: 'var(--r8, 8px)', fontSize: 13, color: '#b91c1c',
        }}>
          <strong>Error:</strong> {saveError}
        </div>
      )}

      {/* ── Progress + summary card ───────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>

        {/* Technician info */}
        {technician && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            paddingBottom: 10, marginBottom: 10,
            borderBottom: '1px solid var(--border-2)',
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--blue-bg,#eff6ff)',
              fontSize: 12, fontWeight: 700, color: 'var(--blue-light,#3b82f6)',
              flexShrink: 0,
            }}>
              {(technician.full_name ?? technician.email ?? 'T').charAt(0).toUpperCase()}
            </span>
            <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.4 }}>
              <span style={{ color: 'var(--text-3)' }}>Technician: </span>
              <strong style={{ color: 'var(--text)', fontWeight: 600 }}>
                {technician.full_name || technician.email || 'Technician'}
              </strong>
              {technician.email && (
                <span style={{ marginLeft: 6, color: 'var(--text-3)' }}>
                  — {technician.email}
                </span>
              )}
              <span style={{
                marginLeft: 8, fontSize: 10, fontWeight: 600,
                padding: '1px 6px', borderRadius: 4,
                background: 'var(--surface-3,#f1f5f9)',
                color: 'var(--text-3)', textTransform: 'capitalize',
              }}>
                {technician.role}
              </span>
            </div>
          </div>
        )}

        {/* Progress row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            Progress — {checkedCount} / {counts.total} items reviewed
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {counts.ok > 0 && (
              <span style={{ fontSize: 12, color: STATUS_SUMMARY_COLOR.ok, fontWeight: 600 }}>✓ {counts.ok} OK</span>
            )}
            {counts.warning > 0 && (
              <span style={{ fontSize: 12, color: STATUS_SUMMARY_COLOR.warning, fontWeight: 600 }}>⚠ {counts.warning} Warning</span>
            )}
            {counts.critical > 0 && (
              <span style={{ fontSize: 12, color: STATUS_SUMMARY_COLOR.critical, fontWeight: 600 }}>! {counts.critical} Critical</span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progressPct}%`, borderRadius: 999, transition: 'width 0.2s',
            background: counts.critical > 0 ? '#dc2626' : counts.warning > 0 ? '#d97706' : '#16a34a',
          }} />
        </div>
      </div>

      {/* ── Sections ──────────────────────────────────────────────────────── */}
      {sections.map(section => (
        <div key={section.section_name} className="card" style={{ marginBottom: 12 }}>

          <div style={{
            fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text-3)',
            paddingBottom: 10, borderBottom: '1px solid var(--border-2)', marginBottom: 4,
          }}>
            {section.section_name}
          </div>

          {section.items.map((item, idx) => {
            const state    = itemState[item.id] ?? { result: 'nc' as ItemResult, note: '' }
            const isLast   = idx === section.items.length - 1
            const noteOpen = expandedNotes.has(item.id)

            return (
              <div
                key={item.id}
                style={{ padding: '10px 0', borderBottom: isLast ? 'none' : '1px solid var(--border-2)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

                  {/* Required marker */}
                  <div style={{
                    width: 4, flexShrink: 0, alignSelf: 'stretch', borderRadius: 2,
                    background: item.is_required ? 'var(--blue-light,#3b82f6)' : 'transparent',
                  }} />

                  {/* Label */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {item.label || item.item_name || '(unlabeled)'}
                      {item.is_required && (
                        <span style={{ fontSize: 10, color: 'var(--blue-light,#3b82f6)', background: 'var(--blue-bg,#eff6ff)', padding: '1px 5px', borderRadius: 4 }}>
                          Required
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{item.description}</div>
                    )}
                  </div>

                  {/* Status buttons */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {STATUS_OPTIONS.map(opt => {
                      const isActive = state.result === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setResult(item.id, opt.value)}
                          disabled={isReadOnly}
                          title={isReadOnly ? 'Inspection is completed' : undefined}
                          style={{
                            padding: '3px 9px', fontSize: 11,
                            fontWeight: isActive ? 700 : 400,
                            borderRadius: 'var(--r6,6px)',
                            border: '1px solid var(--border)',
                            cursor: isReadOnly ? 'default' : 'pointer',
                            opacity: isReadOnly && !isActive ? 0.35 : 1,
                            transition: 'all 0.1s',
                            ...(isActive ? opt.activeStyle : { background: 'transparent', color: 'var(--text-3)' }),
                          }}
                        >
                          {opt.label}
                        </button>
                      )
                    })}

                    {/* Note toggle */}
                    <button
                      type="button"
                      onClick={() => toggleNote(item.id)}
                      disabled={isReadOnly && !state.note}
                      title="Technician note"
                      style={{
                        padding: '3px 7px', fontSize: 11,
                        borderRadius: 'var(--r6,6px)',
                        border: '1px solid var(--border)',
                        cursor: isReadOnly && !state.note ? 'default' : 'pointer',
                        background: state.note ? 'var(--blue-bg,#eff6ff)' : 'transparent',
                        color:      state.note ? 'var(--blue-light,#3b82f6)' : 'var(--text-3)',
                        opacity: isReadOnly && !state.note ? 0.35 : 1,
                      }}
                    >
                      ✎
                    </button>
                  </div>
                </div>

                {/* Note field */}
                {noteOpen && (
                  <div style={{ marginTop: 8, paddingLeft: 14 }}>
                    {isReadOnly ? (
                      state.note ? (
                        <p style={{
                          fontSize: 12, color: 'var(--text-3)', margin: 0,
                          fontStyle: 'italic', lineHeight: 1.5,
                        }}>
                          {state.note}
                        </p>
                      ) : null
                    ) : (
                      <textarea
                        rows={2}
                        className="field-textarea"
                        placeholder="Technician note (optional)…"
                        value={state.note}
                        onChange={e => setNote(item.id, e.target.value)}
                        style={{ fontSize: 12, width: '100%', resize: 'vertical' }}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {/* ── Service Recommendations ────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 96 }}>

        {/* Panel header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: initialRecommendations.length > 0 ? 14 : 0,
          flexWrap: 'wrap',
        }}>
          <div className="section-title" style={{ flex: 1 }}>Service Recommendations</div>

          {initialRecommendations.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--r6,6px)',
              ...(initialRecommendations.some(r => r.priority === 'high')
                ? { background: '#fef2f2', color: '#b91c1c' }
                : { background: '#fffbeb', color: '#92400e' }),
            }}>
              {initialRecommendations.length} item{initialRecommendations.length !== 1 ? 's' : ''}
            </span>
          )}

          {/* Generate button — always visible */}
          <button
            type="button"
            className="btn-ghost"
            disabled={generating}
            onClick={handleGenerate}
            title="Generate recommendations from current inspection results"
            style={{ fontSize: 12, opacity: generating ? 0.6 : 1 }}
          >
            {generating ? 'Generating…' : '⚙ Generate Recommendations'}
          </button>
        </div>

        {/* Generate error */}
        {genError && (
          <div style={{
            marginBottom: 12, padding: '10px 12px',
            background: '#fff0f0', border: '1px solid #fca5a5',
            borderRadius: 'var(--r6,6px)', fontSize: 12, color: '#b91c1c',
          }}>
            <strong>Could not generate:</strong> {genError}
          </div>
        )}

        {/* Empty state */}
        {initialRecommendations.length === 0 && !generating && (
          <div style={{
            padding: '20px 0 4px',
            textAlign: 'center', fontSize: 13, color: 'var(--text-3)',
          }}>
            No recommendations yet.
            {(counts.warning > 0 || counts.critical > 0) ? (
              <span> Save the checklist then click <strong>Generate Recommendations</strong>.</span>
            ) : (
              <span> Mark items as Warning or Critical, save, then generate.</span>
            )}
          </div>
        )}

        {/* Recommendation rows */}
        {initialRecommendations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {initialRecommendations.map(rec => {
              const currentStatus = recStatuses[rec.id] ?? rec.status
              const statusMeta    = REC_STATUS_LABEL[currentStatus] ?? REC_STATUS_LABEL.open
              const recError      = recErrors[rec.id]
              const srcStatus     = rec.source_status ?? null
              const srcBadge      = srcStatus ? SOURCE_STATUS_BADGE[srcStatus] : null

              return (
                <div
                  key={rec.id}
                  style={{
                    padding: '12px 14px', borderRadius: 'var(--r8,8px)',
                    border: '1px solid var(--border)', background: 'var(--surface-2)',
                  }}
                >
                  {/* Row 1: badges + title + status */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>

                    {/* Source status badge (Warning / Critical) */}
                    {srcBadge && (
                      <span style={{
                        display: 'inline-block', marginTop: 2, padding: '2px 7px',
                        borderRadius: 'var(--r6,6px)', fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0,
                        ...srcBadge.style,
                      }}>
                        {srcBadge.label}
                      </span>
                    )}

                    {/* Item name + service title + description */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Original checklist item name */}
                      {rec.item_name && rec.item_name !== rec.title && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 1 }}>
                          {rec.item_name}
                        </div>
                      )}
                      {/* Derived service title */}
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                        {rec.title}
                      </div>
                      {/* Auto-generated description */}
                      {rec.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{rec.description}</div>
                      )}
                      {/* Technician notes */}
                      {rec.technician_notes && (
                        <div style={{
                          marginTop: 5, fontSize: 12,
                          color: 'var(--text-3)', fontStyle: 'italic',
                          padding: '4px 8px',
                          background: 'var(--surface-3,#f8fafc)',
                          borderRadius: 'var(--r4,4px)',
                          borderLeft: '2px solid var(--border)',
                        }}>
                          Tech note: {rec.technician_notes}
                        </div>
                      )}
                    </div>

                    {/* Decision status badge */}
                    <span style={{
                      flexShrink: 0, padding: '2px 8px', borderRadius: 'var(--r6,6px)',
                      fontSize: 11, fontWeight: 600, ...statusMeta.style,
                    }}>
                      {statusMeta.label}
                    </span>
                  </div>

                  {/* Row 2: decision buttons */}
                  <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
                    {REC_DECISION_OPTIONS.map(opt => {
                      const isActive = currentStatus === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleRecDecision(rec.id, opt.value)}
                          style={{
                            padding: '3px 10px', fontSize: 11, fontWeight: isActive ? 700 : 400,
                            borderRadius: 'var(--r6,6px)', border: '1px solid var(--border)',
                            cursor: 'pointer', transition: 'all 0.1s',
                            ...(isActive ? opt.activeStyle : { background: 'transparent', color: 'var(--text-3)' }),
                          }}
                        >
                          {opt.label}
                        </button>
                      )
                    })}

                    {rec.estimated_price != null && (
                      <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                        ${Number(rec.estimated_price).toFixed(2)}
                      </span>
                    )}

                    {rec.section_name && (
                      <span style={{
                        marginLeft: rec.estimated_price != null ? 8 : 'auto',
                        fontSize: 11, color: 'var(--text-3)',
                        padding: '1px 6px', borderRadius: 4,
                        background: 'var(--surface-3,#f1f5f9)',
                      }}>
                        {rec.section_name}
                      </span>
                    )}
                  </div>

                  {recError && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#b91c1c' }}>
                      Failed to update: {recError}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Sticky action bar ─────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', bottom: 16,
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r12,12px)', padding: '12px 16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      }}>

        {isReadOnly ? (
          /* ── Completed mode ─────────────────────────────────────────────── */
          <>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px',
                borderRadius: 'var(--r6,6px)', background: '#f0fdf4',
                color: '#15803d', border: '1px solid #bbf7d0',
              }}>
                ✓ Completed
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {counts.total} items · {counts.critical} critical · {counts.warning} warning
              </span>
            </div>
            <button
              type="button"
              className="btn-ghost"
              disabled={reopening}
              style={{ fontSize: 12, opacity: reopening ? 0.6 : 1 }}
              onClick={handleReopen}
            >
              {reopening ? 'Reopening…' : 'Edit Inspection'}
            </button>
            <a href="/dashboard/inspections" className="btn-ghost" style={{ fontSize: 12 }}>
              ← Back
            </a>
          </>
        ) : (
          /* ── Editable mode ──────────────────────────────────────────────── */
          <>
            <div style={{ flex: 1, fontSize: 12, color: 'var(--text-3)' }}>
              {checkedCount} of {counts.total} items reviewed
              {counts.critical > 0 && (
                <span style={{ color: '#dc2626', fontWeight: 600, marginLeft: 8 }}>
                  · {counts.critical} critical
                </span>
              )}
            </div>

            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              style={{ opacity: saving ? 0.6 : 1 }}
              onClick={handleSave}
            >
              {saving ? 'Saving…' : 'Save Results'}
            </button>

            <button
              type="button"
              className="btn-ghost"
              disabled={completing}
              style={{ fontSize: 12, opacity: completing ? 0.6 : 1 }}
              onClick={handleComplete}
              title={counts.nc > 0 ? `${counts.nc} items still unchecked` : 'Mark inspection as completed'}
            >
              {completing ? 'Completing…' : `Mark Completed${counts.nc > 0 ? ` (${counts.nc} left)` : ''}`}
            </button>

            <a href="/dashboard/inspections" className="btn-ghost" style={{ fontSize: 12 }}>
              Cancel
            </a>
          </>
        )}
      </div>

    </div>
  )
}
