'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addSpecial } from '../../actions'

export default function NewSpecialPage() {
  const router  = useRouter()
  const [error,   setError]   = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result   = await addSpecial(formData)

    if (result?.error) {
      setError(result.error)
      setPending(false)
      return
    }

    router.push('/dashboard/website')
    router.refresh()
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: 560 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Add Special</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>Add a promotion or coupon to your public website.</div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-grid">
            <div className="form-group span-2">
              <label className="field-label">Title <span style={{ color: '#c00' }}>*</span></label>
              <input name="title" className="field-input" placeholder="Oil Change Special" required />
            </div>
            <div className="form-group">
              <label className="field-label">Price Display <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
              <input name="price_display" className="field-input" placeholder="$29.99" />
            </div>
            <div className="form-group">
              <label className="field-label">Expires <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
              <input name="expires_at" className="field-input" type="date" />
            </div>
            <div className="form-group span-2">
              <label className="field-label">Description <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
              <textarea name="description" className="field-textarea" rows={2} placeholder="Full synthetic oil change, up to 5 qts…" />
            </div>
            <div className="form-group span-2">
              <label className="field-label">Fine Print <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
              <textarea name="fine_print" className="field-textarea" rows={2} placeholder="Cannot be combined with other offers…" />
            </div>
          </div>

          {error && (
            <div style={{
              marginTop: 12, padding: '8px 12px', borderRadius: 'var(--r8)',
              background: '#fff0f0', color: '#c00', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={pending}
              style={{ opacity: pending ? 0.6 : 1 }}
            >
              {pending ? 'Saving…' : 'Add Special'}
            </button>
            <a href="/dashboard/website" className="btn-ghost">Cancel</a>
          </div>
        </div>
      </form>
    </div>
  )
}
