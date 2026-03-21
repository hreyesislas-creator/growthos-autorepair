'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Inspection, InspectionTemplateItem, ServiceRecommendation } from '@/lib/types'
import { saveInspectionResults } from '../actions'

// ── Types ──────────────────────────────────────────────────────────────────────

/** Mirrors InspectionItem.status — 1:1 with DB enum values */
type ItemResult = 'pass' | 'attention' | 'urgent' | 'not_checked'

interface ItemState {
  result: ItemResult
  note: string
}

interface Section {
  section_name: string
  items: InspectionTemplateItem[]
}

/** Shape of the existing inspection_items rows loaded from DB */
interface ExistingItem {
  template_item_id: string | null
  /** DB column is status, not result */
  status: ItemResult
  notes: string | null
}

interface Props {
  inspection:             Inspection
  sections:               Section[]
  existingItems:          ExistingItem[]
  /** Server-fetched recommendations — refreshed by router.refresh() after save */
  initialRecommendations: ServiceRecommendation[]
}

// ── Status button config ───────────────────────────────────────────────────────

const STATUS_OPTIONS: {
  value:       ItemResult
  label:       string
  activeStyle: React.CSSProperties
}[] = [
  {
    value:       'pass',
    label:       'OK',
    activeStyle: { background: '#16a34a', color: '#fff', borderColor: '#16a34a' },
  },
  {
    value:       'attention',
    label:       'Warning',
    activeStyle: { background: '#d97706', color: '#fff', borderColor: '#d97706' },
  },
  {
    value:       'urgent',
    label:       'Critical',
    activeStyle: { background: '#dc2626', color: '#fff', borderColor: '#dc2626' },
  },
  {
    value:       'not_checked',
    label:       'N/C',
    activeStyle: {
      background:  'var(--surface-3, #e5e7eb)',
      color:       'var(--text-3)',
      borderColor: 'var(--border)',
    },
  },
]

const STATUS_SUMMARY_COLOR: Record<ItemResult, string> = {
  pass:        '#16a34a',
  attention:   '#d97706',
  urgent:      '#dc2626',
  not_checked: 'var(--text-3)',
}

const PRIORITY_STYLE: Record<string, React.CSSProperties> = {
  high:   { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' },
  medium: { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' },
  low:    { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildInitialState(
  sections:      Section[],
  existingItems: ExistingItem[],
): Record<string, ItemState> {
  const state: Record<string, ItemState> = {}

  const existingMap = new Map<string, ExistingItem>()
  for (const ei of existingItems) {
    if (ei.template_item_id) existingMap.set(ei.template_item_id, ei)
  }

  for (const section of sections) {
    for (const item of section.items) {
      const existing = existingMap.get(item.id)
      state[item.id] = {
        result: existing?.status ?? 'not_checked',
        note:   existing?.notes  ?? '',
      }
    }
  }

  return state
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InspectionChecklist({
  inspection,
  sections,
  existingItems,
  initialRecommendations,
}: Props) {
  const router = useRouter()

  const [itemState, setItemState] = useState<Record<string, ItemState>>(
    () => buildInitialState(sections, existingItems),
  )
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [saving,     setSaving]     = useState(false)
  const [saveResult, setSaveResult] = useState<'idle' | 'success' | 'error'>('idle')
  const [saveError,  setSaveError]  = useState<string | null>(null)

  // ── Derived counts ────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const acc = { pass: 0, attention: 0, urgent: 0, not_checked: 0, total: 0 }
    for (const s of Object.values(itemState)) {
      acc[s.result]++
      acc.total++
    }
    return acc
  }, [itemState])

  const checkedCount = counts.total - counts.not_checked
  const progressPct  = counts.total > 0
    ? Math.round((checkedCount / counts.total) * 100)
    : 0

  // ── Label lookup (built once from sections) ───────────────────────────────────
  const labelMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const section of sections) {
      for (const item of section.items) {
        map.set(item.id, item.label || item.item_name || item.id)
      }
    }
    return map
  }, [sections])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function setResult(itemId: string, result: ItemResult) {
    setSaveResult('idle')
    setItemState(prev => ({ ...prev, [itemId]: { ...prev[itemId], result } }))
  }

  function setNote(itemId: string, note: string) {
    setItemState(prev => ({ ...prev, [itemId]: { ...prev[itemId], note } }))
  }

  function toggleNoteExpanded(itemId: string) {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      next.has(itemId) ? next.delete(itemId) : next.add(itemId)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setSaveResult('idle')
    setSaveError(null)

    // Include label so the action can generate recommendation titles without
    // an extra DB round-trip to look up template item names.
    const payload = Object.entries(itemState).map(([templateItemId, s]) => ({
      template_item_id: templateItemId,
      status:           s.result,
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
    // Refresh server component so recommendations panel + inspection header
    // reflect the newly saved data without a full page reload.
    router.refresh()
  }

  // ── Render ────────────────────────────────────────────────────────────────────

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

  return (
    <div className="dash-content">

      {/* ── Save result banners ───────────────────────────────────────────────── */}
      {saveResult === 'success' && (
        <div style={{
          marginBottom: 16, padding: '12px 16px',
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 'var(--r8, 8px)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>
              Results saved.
            </span>
            <span style={{ fontSize: 13, color: '#166534', marginLeft: 6 }}>
              {counts.urgent > 0
                ? `${counts.urgent} critical item${counts.urgent !== 1 ? 's' : ''} flagged — recommendations generated below.`
                : counts.not_checked === 0
                ? 'Inspection marked completed.'
                : `${counts.not_checked} item${counts.not_checked !== 1 ? 's' : ''} still unchecked.`}
            </span>
          </div>
        </div>
      )}

      {saveResult === 'error' && saveError && (
        <div style={{
          marginBottom: 16, padding: '12px 16px',
          background: '#fff0f0', border: '1px solid #fca5a5',
          borderRadius: 'var(--r8, 8px)', fontSize: 13, color: '#b91c1c',
        }}>
          <strong>Save failed:</strong> {saveError}
        </div>
      )}

      {/* ── Progress bar ──────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 10,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            Progress — {checkedCount} / {counts.total} items reviewed
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {counts.pass > 0 && (
              <span style={{ fontSize: 12, color: STATUS_SUMMARY_COLOR.pass, fontWeight: 600 }}>
                ✓ {counts.pass} OK
              </span>
            )}
            {counts.attention > 0 && (
              <span style={{ fontSize: 12, color: STATUS_SUMMARY_COLOR.attention, fontWeight: 600 }}>
                ⚠ {counts.attention} Warning
              </span>
            )}
            {counts.urgent > 0 && (
              <span style={{ fontSize: 12, color: STATUS_SUMMARY_COLOR.urgent, fontWeight: 600 }}>
                ! {counts.urgent} Critical
              </span>
            )}
          </div>
        </div>

        <div style={{ height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: counts.urgent > 0 ? '#dc2626'
              : counts.attention > 0      ? '#d97706'
              : '#16a34a',
            borderRadius: 999,
            transition: 'width 0.2s',
          }} />
        </div>
      </div>

      {/* ── Sections ──────────────────────────────────────────────────────────── */}
      {sections.map(section => (
        <div key={section.section_name} className="card" style={{ marginBottom: 12 }}>

          <div style={{
            fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text-3)',
            paddingBottom: 10, borderBottom: '1px solid var(--border-2)',
            marginBottom: 4,
          }}>
            {section.section_name}
          </div>

          {section.items.map((item, idx) => {
            const state    = itemState[item.id] ?? { result: 'not_checked', note: '' }
            const isLast   = idx === section.items.length - 1
            const noteOpen = expandedNotes.has(item.id)

            return (
              <div
                key={item.id}
                style={{
                  padding:      '10px 0',
                  borderBottom: isLast ? 'none' : '1px solid var(--border-2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

                  <div style={{
                    width: 4, flexShrink: 0, alignSelf: 'stretch', borderRadius: 2,
                    background: item.is_required ? 'var(--blue-light, #3b82f6)' : 'transparent',
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 500, color: 'var(--text)',
                      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                    }}>
                      {item.label || item.item_name || '(unlabeled item)'}
                      {item.is_required && (
                        <span style={{
                          fontSize: 10, color: 'var(--blue-light, #3b82f6)',
                          background: 'var(--blue-bg, #eff6ff)',
                          padding: '1px 5px', borderRadius: 4,
                        }}>
                          Required
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                        {item.description}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {STATUS_OPTIONS.map(opt => {
                      const isActive = state.result === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setResult(item.id, opt.value)}
                          style={{
                            padding: '3px 9px', fontSize: 11,
                            fontWeight: isActive ? 700 : 400,
                            borderRadius: 'var(--r6, 6px)',
                            border: '1px solid var(--border)',
                            cursor: 'pointer', transition: 'all 0.1s',
                            ...(isActive
                              ? opt.activeStyle
                              : { background: 'transparent', color: 'var(--text-3)' }),
                          }}
                        >
                          {opt.label}
                        </button>
                      )
                    })}

                    <button
                      type="button"
                      onClick={() => toggleNoteExpanded(item.id)}
                      title="Add technician note"
                      style={{
                        padding: '3px 7px', fontSize: 11,
                        borderRadius: 'var(--r6, 6px)',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        background: state.note ? 'var(--blue-bg, #eff6ff)' : 'transparent',
                        color:      state.note ? 'var(--blue-light, #3b82f6)' : 'var(--text-3)',
                      }}
                    >
                      ✎
                    </button>
                  </div>
                </div>

                {noteOpen && (
                  <div style={{ marginTop: 8, paddingLeft: 14 }}>
                    <textarea
                      rows={2}
                      className="field-textarea"
                      placeholder="Technician note (optional)…"
                      value={state.note}
                      onChange={e => setNote(item.id, e.target.value)}
                      style={{ fontSize: 12, width: '100%', resize: 'vertical' }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {/* ── Recommendations panel ─────────────────────────────────────────────── */}
      {initialRecommendations.length > 0 && (
        <div className="card" style={{ marginBottom: 80 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 14,
          }}>
            <div className="section-title">
              Service Recommendations
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px',
              borderRadius: 'var(--r6, 6px)',
              background: initialRecommendations.some(r => r.priority === 'high')
                ? '#fef2f2' : '#fffbeb',
              color: initialRecommendations.some(r => r.priority === 'high')
                ? '#b91c1c' : '#92400e',
            }}>
              {initialRecommendations.length} item{initialRecommendations.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {initialRecommendations.map(rec => (
              <div
                key={rec.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--r8, 8px)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {/* Priority badge */}
                  <span style={{
                    display: 'inline-block',
                    marginTop: 1,
                    padding: '2px 7px',
                    borderRadius: 'var(--r6, 6px)',
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.04em',
                    ...(PRIORITY_STYLE[rec.priority] ?? PRIORITY_STYLE.medium),
                  }}>
                    {rec.priority === 'high' ? '⚠ Critical' : '! Warning'}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                      {rec.title}
                    </div>
                    {rec.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {rec.description}
                      </div>
                    )}
                  </div>

                  {/* Status + price */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <span className="badge badge-gray" style={{ fontSize: 10 }}>
                      {rec.status}
                    </span>
                    {rec.estimated_price != null && (
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                        ${Number(rec.estimated_price).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sticky save bar ───────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', bottom: 16,
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r12, 12px)',
        padding: '12px 16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      }}>
        <div style={{ flex: 1, fontSize: 12, color: 'var(--text-3)' }}>
          {checkedCount} of {counts.total} items reviewed
          {counts.urgent > 0 && (
            <span style={{ color: '#dc2626', fontWeight: 600, marginLeft: 8 }}>
              · {counts.urgent} critical
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

        <a href="/dashboard/inspections" className="btn-ghost">Cancel</a>
      </div>

    </div>
  )
}
