'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addGalleryItem } from '../../actions'

export default function NewGalleryItemClient() {
  const router  = useRouter()
  const [error,   setError]   = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [preview, setPreview] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result   = await addGalleryItem(formData)

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
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Add Gallery Photo</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          Enter a public image URL to add to your gallery.
          {' '}
          <span style={{ color: 'var(--text-3)' }}>Storage upload coming soon.</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-grid">
            <div className="form-group span-2">
              <label className="field-label">Image URL <span style={{ color: '#c00' }}>*</span></label>
              <input
                name="image_url"
                className="field-input"
                placeholder="https://..."
                type="url"
                required
                onChange={e => setPreview(e.target.value)}
              />
            </div>

            {preview && (
              <div className="form-group span-2">
                <img
                  src={preview}
                  alt="Preview"
                  style={{
                    width: '100%', maxHeight: 200, objectFit: 'cover',
                    borderRadius: 'var(--r8)', border: '1px solid var(--border)',
                  }}
                  onError={() => setPreview('')}
                />
              </div>
            )}

            <div className="form-group span-2">
              <label className="field-label">Caption <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
              <input name="caption" className="field-input" placeholder="Shop interior, engine rebuild…" />
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
              {pending ? 'Saving…' : 'Add Photo'}
            </button>
            <a href="/dashboard/website" className="btn-ghost">Cancel</a>
          </div>
        </div>
      </form>
    </div>
  )
}
