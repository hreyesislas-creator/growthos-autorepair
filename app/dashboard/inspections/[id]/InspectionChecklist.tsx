'use client'

import { useState, useMemo } from 'react'
import type { Inspection, InspectionTemplateItem } from '@/lib/types'

// ── Types ──────────────────────────────────────────────────────────────────────

/** Mirrors InspectionItem.result — kept in sync so wiring persistence is trivial */
type ItemResult = 'pass' | 'attention' | 'urgent' | 'not_checked'

interface ItemState {
  result: ItemResult
  note: string
}

interface Section {
  section_name: string
  items: InspectionTemplateItem[]
}

interface ExistingItem {
  template_item_id: string | null
  result: ItemResult
  technician_note: string | null
}

interface Props {
  inspection:    Inspection
  sections:      Section[]
  existingItems: ExistingItem[]
}

// ── Status button config ───────────────────────────────────────────────────────

const STATUS_OPTIONS: {
  value:     ItemResult
  label:     string
  shortLabel: string
  activeStyle: React.CSSProperties
}[] = [
  {
    value:       'pass',
    label:       'OK',
    shortLabel:  'OK',
    activeStyle: {
      background: '#16a34a',
      color:      '#fff',
      borderColor: '#16a34a',
    },
  },
  {
    value:       'attention',
    label:       'Warning',
    shortLabel:  '⚠',
    activeStyle: {
      background: '#d97706',
      color:      '#fff',
      borderColor: '#d97706',
    },
  },
  {
    value:       'urgent',
    label:       'Critical',
    shortLabel:  '!',
    activeStyle: {
      background: '#dc2626',
      color:      '#fff',
      borderColor: '#dc2626',
    },
  },
  {
    value:       'not_checked',
    label:       'N/C',
    shortLabel:  '—',
    activeStyle: {
      background: 'var(--surface-3, #e5e7eb)',
      color:      'var(--text-3)',
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
        result: existing?.result ?? 'not_checked',
        note:   existing?.technician_note ?? '',
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
}: Props) {
  const [itemState, setItemState] = useState<Record<string, ItemState>>(
    () => buildInitialState(sections, existingItems),
  )
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // ── Counts for the progress bar ──────────────────────────────────────────────
  const counts = useMemo(() => {
    const result = { pass: 0, attention: 0, urgent: 0, not_checked: 0, total: 0 }
    for (const s of Object.values(itemState)) {
      result[s.result]++
      result.total++
    }
    return result
  }, [itemState])

  const checkedCount = counts.total - counts.not_checked
  const progressPct  = counts.total > 0
    ? Math.round((checkedCount / counts.total) * 100)
    : 0

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function setResult(itemId: string, result: ItemResult) {
    setItemState(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], result },
    }))
  }

  function setNote(itemId: string, note: string) {
    setItemState(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], note },
    }))
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
    // TODO: wire to saveInspectionResults server action.
    // Shape to send:
    //   inspectionId: inspection.id
    //   tenantId:     inspection.tenant_id
    //   items: Object.entries(itemState).map(([templateItemId, s]) => ({
    //     template_item_id:  templateItemId,
    //     result:            s.result,
    //     technician_note:   s.note || null,
    //   }))
    //
    // The action will upsert inspection_items rows and set inspection.status
    // to 'in_progress' if currently 'draft', or 'completed' if all items checked.
    console.log('[InspectionChecklist] save payload:', {
      inspectionId: inspection.id,
      items: Object.entries(itemState).map(([id, s]) => ({
        template_item_id: id,
        result:           s.result,
        technician_note:  s.note || null,
      })),
    })
    await new Promise(r => setTimeout(r, 600)) // remove when action is wired
    setSaving(false)
    alert('Results logged to console. Persistence will be wired in next pass.')
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

      {/* ── Progress bar ──────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 10,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            Progress — {checkedCount} / {counts.total} items checked
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

        {/* Progress track */}
        <div style={{
          height: 6, background: 'var(--border)',
          borderRadius: 999, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: counts.urgent > 0 ? '#dc2626'
              : counts.attention > 0    ? '#d97706'
              : '#16a34a',
            borderRadius: 999,
            transition: 'width 0.2s',
          }} />
        </div>
      </div>

      {/* ── Sections ──────────────────────────────────────────────────────────── */}
      {sections.map(section => (
        <div key={section.section_name} className="card" style={{ marginBottom: 12 }}>

          {/* Section header */}
          <div style={{
            fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text-3)',
            paddingBottom: 10, borderBottom: '1px solid var(--border-2)',
            marginBottom: 4,
          }}>
            {section.section_name}
          </div>

          {/* Items */}
          {section.items.map((item, idx) => {
            const state   = itemState[item.id] ?? { result: 'not_checked', note: '' }
            const isLast  = idx === section.items.length - 1
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

                  {/* Required marker */}
                  <div style={{
                    width: 4, flexShrink: 0, alignSelf: 'stretch',
                    borderRadius: 2,
                    background: item.is_required ? 'var(--blue-light, #3b82f6)' : 'transparent',
                  }} />

                  {/* Label + description */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 500, color: 'var(--text)',
                      display: 'flex', alignItems: 'center', gap: 6,
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

                  {/* Status buttons */}
                  <div style={{
                    display: 'flex', gap: 4, flexShrink: 0,
                    flexWrap: 'wrap', justifyContent: 'flex-end',
                  }}>
                    {STATUS_OPTIONS.map(opt => {
                      const isActive = state.result === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setResult(item.id, opt.value)}
                          style={{
                            padding:      '3px 9px',
                            fontSize:     11,
                            fontWeight:   isActive ? 700 : 400,
                            borderRadius: 'var(--r6, 6px)',
                            border:       '1px solid var(--border)',
                            cursor:       'pointer',
                            transition:   'all 0.1s',
                            ...(isActive
                              ? opt.activeStyle
                              : {
                                  background: 'transparent',
                                  color:      'var(--text-3)',
                                }),
                          }}
                        >
                          {opt.label}
                        </button>
                      )
                    })}

                    {/* Note toggle */}
                    <button
                      type="button"
                      onClick={() => toggleNoteExpanded(item.id)}
                      title="Add technician note"
                      style={{
                        padding:    '3px 7px',
                        fontSize:   11,
                        borderRadius: 'var(--r6, 6px)',
                        border:     '1px solid var(--border)',
                        cursor:     'pointer',
                        background: state.note ? 'var(--blue-bg, #eff6ff)' : 'transparent',
                        color:      state.note ? 'var(--blue-light, #3b82f6)' : 'var(--text-3)',
                      }}
                    >
                      ✎
                    </button>
                  </div>
                </div>

                {/* Expandable note field */}
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

      {/* ── Save bar ──────────────────────────────────────────────────────────── */}
      <div style={{
        position:   'sticky',
        bottom:     16,
        display:    'flex',
        alignItems: 'center',
        gap:        12,
        background: 'var(--surface)',
        border:     '1px solid var(--border)',
        borderRadius: 'var(--r12, 12px)',
        padding:    '12px 16px',
        boxShadow:  '0 4px 16px rgba(0,0,0,0.08)',
      }}>
        <div style={{ flex: 1, fontSize: 12, color: 'var(--text-3)' }}>
          {checkedCount} of {counts.total} items reviewed
          {counts.urgent > 0 && (
            <span style={{ color: '#dc2626', fontWeight: 600, marginLeft: 8 }}>
              · {counts.urgent} critical item{counts.urgent !== 1 ? 's' : ''}
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

        <a
          href="/dashboard/inspections"
          className="btn-ghost"
        >
          Cancel
        </a>
      </div>

    </div>
  )
}
