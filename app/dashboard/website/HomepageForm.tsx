'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveHomepageContent } from './actions'
import type { HomepageContent } from '@/lib/types'

interface Props {
  content:   HomepageContent | null
  readOnly?: boolean
}

export default function HomepageForm({ content, readOnly = false }: Props) {
  const router = useRouter()
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (readOnly) return
    setPending(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const result   = await saveHomepageContent(formData)

    if (result?.error) {
      setError(result.error)
      setPending(false)
      return
    }

    setSuccess(true)
    setPending(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset
        disabled={readOnly}
        style={{ border: 'none', padding: 0, margin: 0, minWidth: 0 }}
      >
      <div className="card">
        <div className="section-header">
          <div className="section-title">Homepage Content</div>
          {!readOnly && (
            <button
              type="submit"
              className="btn-primary"
              disabled={pending}
              style={{ fontSize: '12px', padding: '6px 12px', opacity: pending ? 0.6 : 1 }}
            >
              {pending ? 'Saving…' : success ? '✓ Saved' : 'Save'}
            </button>
          )}
        </div>

        <div className="form-grid">
          <div className="form-group span-2">
            <label className="field-label">Hero Headline</label>
            <input
              name="hero_headline"
              className="field-input"
              defaultValue={content?.hero_headline ?? ''}
              placeholder="Your #1 Auto Repair Shop"
            />
          </div>
          <div className="form-group span-2">
            <label className="field-label">Hero Sub-Headline</label>
            <input
              name="hero_subheadline"
              className="field-input"
              defaultValue={content?.hero_subheadline ?? ''}
              placeholder="Serving Banning, CA since 2008"
            />
          </div>
          <div className="form-group">
            <label className="field-label">CTA Button Text</label>
            <input
              name="hero_cta_text"
              className="field-input"
              defaultValue={content?.hero_cta_text ?? ''}
              placeholder="Book Appointment"
            />
          </div>
          <div className="form-group">
            <label className="field-label">CTA Button URL</label>
            <input
              name="hero_cta_url"
              className="field-input"
              defaultValue={content?.hero_cta_url ?? ''}
              placeholder="/appointments"
            />
          </div>
          <div className="form-group span-2">
            <label className="field-label">About Section Body</label>
            <textarea
              name="about_body"
              className="field-textarea"
              defaultValue={content?.about_body ?? ''}
              placeholder="Tell customers about your shop..."
              rows={4}
            />
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
      </div>
      </fieldset>
    </form>
  )
}
