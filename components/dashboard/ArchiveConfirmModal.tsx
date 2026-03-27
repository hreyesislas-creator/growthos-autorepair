'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReasonOption {
  /** Machine value sent to the server action (e.g. 'duplicate', 'other') */
  value: string
  /** Human label shown in the dropdown */
  label: string
}

export interface ArchiveConfirmModalProps {
  // ── Visibility ──────────────────────────────────────────────────────────────
  isOpen:   boolean
  onClose:  () => void

  // ── Content ─────────────────────────────────────────────────────────────────
  /** Lowercase entity name used in title / button text: 'inspection' | 'estimate' | 'work order' */
  entityType:  string
  /** Human-readable identifier shown in the subtitle: 'EST-2024-0012', 'WO-2024-0003' */
  entityLabel: string
  /** Verb shown in the title and confirm button: 'Archive' | 'Void' | 'Cancel' */
  actionLabel: string

  // ── Warning tier ────────────────────────────────────────────────────────────
  /**
   * hard_block    → red banner, no form, no confirm button, only "Dismiss"
   * strong_warning → amber banner, form shown, extra confirmation friction
   * standard      → neutral banner, form shown
   */
  warningTier: 'hard_block' | 'strong_warning' | 'standard'
  /** Full message shown in the warning banner. Caller composes this text. */
  warningText: string

  // ── Form ─────────────────────────────────────────────────────────────────────
  /** Entity-specific reason options for the dropdown */
  reasonOptions: ReasonOption[]

  // ── Callbacks ───────────────────────────────────────────────────────────────
  /** Called with (reason, note) when the user confirms. Parent calls the server action. */
  onConfirm: (reason: string, note: string) => void

  // ── Async state (fully controlled by parent) ─────────────────────────────────
  /** Disable all inputs and show loading state on confirm button */
  isSubmitting: boolean
  /** Server error message from the archive action, if any */
  errorMessage: string | null
}

// ── Warning tier styles ───────────────────────────────────────────────────────

const TIER_STYLES = {
  hard_block: {
    bg:     'var(--red-soft,rgba(239,68,68,.14))',
    border: '1px solid rgba(239,68,68,.30)',
    color:  'var(--red,#ef4444)',
    icon:   '⛔',
  },
  strong_warning: {
    bg:     'var(--yellow-soft,rgba(245,158,11,.14))',
    border: '1px solid rgba(245,158,11,.30)',
    color:  'var(--yellow,#f59e0b)',
    icon:   '⚠️',
  },
  standard: {
    bg:     'rgba(255,255,255,.03)',
    border: '1px solid var(--border,rgba(255,255,255,.08))',
    color:  'var(--text-3,rgba(232,237,242,.38))',
    icon:   'ℹ️',
  },
} as const

// ── Component ─────────────────────────────────────────────────────────────────

export default function ArchiveConfirmModal({
  isOpen,
  onClose,
  entityType,
  entityLabel,
  actionLabel,
  warningTier,
  warningText,
  reasonOptions,
  onConfirm,
  isSubmitting,
  errorMessage,
}: ArchiveConfirmModalProps) {

  // ── Local form state — reset whenever modal opens ──────────────────────────
  const [reason, setReason] = useState('')
  const [note,   setNote]   = useState('')

  useEffect(() => {
    if (isOpen) {
      setReason('')
      setNote('')
    }
  }, [isOpen])

  // ── Keyboard: Escape closes the modal ──────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !isSubmitting) onClose()
  }, [isSubmitting, onClose])

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  // ── Derived form validity ──────────────────────────────────────────────────
  const noteRequired  = reason === 'other'
  const isFormValid   = reason !== '' && (!noteRequired || note.trim() !== '')
  const canConfirm    = isFormValid && !isSubmitting
  const isHardBlock   = warningTier === 'hard_block'

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    if (!canConfirm || isHardBlock) return
    onConfirm(reason, note.trim())
  }

  // ── Backdrop click ─────────────────────────────────────────────────────────
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSubmitting) onClose()
  }

  if (!isOpen) return null

  const tier = TIER_STYLES[warningTier]

  // Capitalize first letter of entityType for title display
  const entityDisplay  = entityType.charAt(0).toUpperCase() + entityType.slice(1)
  const title          = `${actionLabel} this ${entityDisplay}?`
  const confirmLabel   = isSubmitting
    ? `${actionLabel}ing…`
    : `${actionLabel} ${entityDisplay}`

  return (
    // ── Backdrop ──────────────────────────────────────────────────────────────
    <div
      onClick={handleBackdropClick}
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         1000,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        background:     'rgba(0,0,0,0.72)',
        padding:        '20px',
      }}
    >
      {/* ── Modal card ────────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-modal-title"
        style={{
          background:   'var(--surface,#141b24)',
          border:       '1px solid var(--border,rgba(255,255,255,.08))',
          borderRadius: 'var(--r10,10px)',
          boxShadow:    'var(--shadow,0 4px 16px rgba(0,0,0,.4)), 0 0 0 1px rgba(255,255,255,.04)',
          width:        '100%',
          maxWidth:     '440px',
          overflow:     'hidden',
        }}
      >

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{
          display:        'flex',
          alignItems:     'flex-start',
          justifyContent: 'space-between',
          padding:        '20px 20px 16px',
          borderBottom:   '1px solid var(--border-2,rgba(255,255,255,.04))',
        }}>
          <div>
            <div
              id="archive-modal-title"
              style={{
                fontSize:   15,
                fontWeight: 700,
                color:      'var(--text,#e8edf2)',
                lineHeight: 1.3,
              }}
            >
              {title}
            </div>
            <div style={{
              fontSize:    12,
              color:       'var(--text-3,rgba(232,237,242,.38))',
              marginTop:   4,
              fontFamily:  'var(--font-mono,monospace)',
              letterSpacing: '0.02em',
            }}>
              {entityLabel}
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={() => !isSubmitting && onClose()}
            disabled={isSubmitting}
            aria-label="Close"
            style={{
              background:   'none',
              border:       'none',
              color:        'var(--text-3,rgba(232,237,242,.38))',
              cursor:       isSubmitting ? 'default' : 'pointer',
              fontSize:     18,
              lineHeight:   1,
              padding:      '2px 4px',
              borderRadius: 4,
              opacity:      isSubmitting ? 0.4 : 1,
              flexShrink:   0,
              marginTop:    -2,
              marginLeft:   12,
              transition:   'color .15s',
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div style={{ padding: '16px 20px 20px' }}>

          {/* Warning banner */}
          <div style={{
            display:      'flex',
            gap:          10,
            alignItems:   'flex-start',
            padding:      '10px 12px',
            background:   tier.bg,
            border:       tier.border,
            borderRadius: 'var(--r6,6px)',
            marginBottom: isHardBlock ? 0 : 16,
          }}>
            <span style={{ fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>
              {tier.icon}
            </span>
            <span style={{
              fontSize:   12,
              color:      tier.color,
              lineHeight: 1.5,
            }}>
              {warningText}
            </span>
          </div>

          {/* Form — hidden for hard_block tier */}
          {!isHardBlock && (
            <>
              {/* Reason dropdown */}
              <div style={{ marginBottom: 12 }}>
                <label
                  htmlFor="archive-reason"
                  className="field-label"
                  style={{ display: 'block', marginBottom: 6 }}
                >
                  Reason
                  <span style={{ color: 'var(--red,#ef4444)', marginLeft: 2 }}>*</span>
                </label>
                <select
                  id="archive-reason"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  disabled={isSubmitting}
                  className="field-input"
                  style={{ width: '100%' }}
                >
                  <option value="" disabled>Select a reason…</option>
                  {reasonOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Note textarea */}
              <div style={{ marginBottom: errorMessage ? 12 : 0 }}>
                <label
                  htmlFor="archive-note"
                  className="field-label"
                  style={{ display: 'block', marginBottom: 6 }}
                >
                  Note
                  {noteRequired ? (
                    <span style={{ color: 'var(--red,#ef4444)', marginLeft: 2 }}>*</span>
                  ) : (
                    <span style={{
                      color:       'var(--text-3,rgba(232,237,242,.38))',
                      fontWeight:  400,
                      marginLeft:  4,
                      textTransform: 'none',
                      letterSpacing: 0,
                    }}>
                      — optional
                    </span>
                  )}
                </label>
                <textarea
                  id="archive-note"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  disabled={isSubmitting}
                  placeholder={
                    noteRequired
                      ? 'Please describe the reason in more detail…'
                      : 'Add any additional context for your records…'
                  }
                  maxLength={500}
                  rows={3}
                  className="field-input"
                  style={{ width: '100%', resize: 'vertical', minHeight: 72 }}
                />
                {/* Character count hint */}
                {note.length > 400 && (
                  <div style={{
                    fontSize:  11,
                    color:     note.length >= 500
                      ? 'var(--red,#ef4444)'
                      : 'var(--text-3,rgba(232,237,242,.38))',
                    marginTop: 4,
                    textAlign: 'right',
                  }}>
                    {note.length}/500
                  </div>
                )}
              </div>

              {/* Server error message */}
              {errorMessage && (
                <div style={{
                  marginTop:    8,
                  padding:      '8px 12px',
                  background:   'var(--red-soft,rgba(239,68,68,.14))',
                  border:       '1px solid rgba(239,68,68,.25)',
                  borderRadius: 'var(--r6,6px)',
                  fontSize:     12,
                  color:        'var(--red,#ef4444)',
                  lineHeight:   1.5,
                }}>
                  ✕ {errorMessage}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div style={{
          display:        'flex',
          justifyContent: 'flex-end',
          alignItems:     'center',
          gap:            8,
          padding:        '12px 20px',
          borderTop:      '1px solid var(--border-2,rgba(255,255,255,.04))',
          background:     'rgba(0,0,0,.12)',
        }}>
          {/* Cancel / Dismiss */}
          <button
            type="button"
            onClick={() => !isSubmitting && onClose()}
            disabled={isSubmitting}
            className="btn-ghost"
            style={{
              fontSize:  12,
              padding:   '6px 14px',
              opacity:   isSubmitting ? 0.5 : 1,
              cursor:    isSubmitting ? 'default' : 'pointer',
            }}
          >
            {isHardBlock ? 'Dismiss' : 'Cancel'}
          </button>

          {/* Confirm button — hidden for hard_block */}
          {!isHardBlock && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              style={{
                fontSize:     12,
                fontWeight:   700,
                padding:      '7px 16px',
                borderRadius: 'var(--r6,6px)',
                border:       '1px solid rgba(239,68,68,.35)',
                cursor:       canConfirm ? 'pointer' : 'default',
                background:   canConfirm
                  ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                  : 'var(--red-soft,rgba(239,68,68,.14))',
                color:        canConfirm ? '#fff' : 'var(--red,#ef4444)',
                opacity:      canConfirm ? 1 : 0.6,
                transition:   'all .15s',
                boxShadow:    canConfirm ? '0 2px 8px rgba(239,68,68,.30)' : 'none',
                whiteSpace:   'nowrap',
              }}
            >
              {confirmLabel}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
