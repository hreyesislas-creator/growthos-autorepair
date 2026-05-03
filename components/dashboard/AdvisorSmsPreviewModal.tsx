'use client'

import { useEffect } from 'react'

export type AdvisorSmsPreviewModalProps = {
  open: boolean
  onClose: () => void
  customerName: string
  /** Display string (may be empty if unknown). */
  phoneDisplay: string | null
  previewMessage: string
}

/**
 * Read-only SMS preview + disabled Send (Phase 2A — no provider calls).
 */
export default function AdvisorSmsPreviewModal({
  open,
  onClose,
  customerName,
  phoneDisplay,
  previewMessage,
}: AdvisorSmsPreviewModalProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const phoneLine = phoneDisplay?.trim() || '—'

  return (
    <div className="advisor-sms-modal-root">
      <button type="button" className="advisor-sms-modal-backdrop" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="advisor-sms-preview-title"
        className="card advisor-sms-modal-panel"
        style={{ padding: '18px 18px 16px' }}
        onClick={e => e.stopPropagation()}
      >
        <div id="advisor-sms-preview-title" style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>
          Message preview
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.45 }}>
          Preview only — SMS is not sent yet.
        </p>

        <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text)' }}>
          <div style={{ fontWeight: 600 }}>Customer</div>
          <div style={{ marginTop: 4 }}>{customerName}</div>
        </div>
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text)' }}>
          <div style={{ fontWeight: 600 }}>Phone</div>
          <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{phoneLine}</div>
        </div>
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text)' }}>
          <div style={{ fontWeight: 600 }}>Message</div>
          <div
            style={{
              marginTop: 8,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-2)',
              background: 'var(--bg-2)',
              fontSize: 13,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}
          >
            {previewMessage}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" disabled title="Sending is not enabled yet">
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
