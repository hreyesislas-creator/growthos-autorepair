'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addTireBrand } from '../../actions'

export default function NewTireBrandClient() {
  const router  = useRouter()
  const [error,   setError]   = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result   = await addTireBrand(formData)

    if (result?.error) {
      setError(result.error)
      setPending(false)
      return
    }

    router.push('/dashboard/website')
    router.refresh()
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: 520 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Add Tire Brand</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>Add a tire brand you carry to your public website.</div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-grid">
            <div className="form-group span-2">
              <label className="field-label">Brand Name <span style={{ color: '#c00' }}>*</span></label>
              <input name="name" className="field-input" placeholder="Michelin" required />
            </div>
            <div className="form-group span-2">
              <label className="field-label">Logo URL <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
              <input name="logo_url" className="field-input" placeholder="https://..." type="url" />
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
              {pending ? 'Saving…' : 'Add Brand'}
            </button>
            <a href="/dashboard/website" className="btn-ghost">Cancel</a>
          </div>
        </div>
      </form>
    </div>
  )
}
