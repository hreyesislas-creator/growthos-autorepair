'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveSectionVisibility } from './actions'
import type { WebsiteSettings } from '@/lib/types'

const TOGGLE_FIELDS = [
  { key: 'show_hero',                  label: 'Hero' },
  { key: 'show_services',              label: 'Services' },
  { key: 'show_trust',                 label: 'Trust Section' },
  { key: 'show_tire_brands',           label: 'Tire Brands' },
  { key: 'show_specials',              label: 'Specials' },
  { key: 'show_vehicles_we_service',   label: 'Vehicles We Service' },
  { key: 'show_warranty',              label: 'Warranty' },
  { key: 'show_gallery',               label: 'Gallery' },
  { key: 'show_reviews',               label: 'Reviews' },
  { key: 'show_financing',             label: 'Financing' },
  { key: 'show_about',                 label: 'About / Contact' },
] as const

type Key = typeof TOGGLE_FIELDS[number]['key']

interface Props {
  settings: WebsiteSettings | null
}

export default function SectionVisibilityForm({ settings }: Props) {
  const router = useRouter()

  const initial = Object.fromEntries(
    TOGGLE_FIELDS.map(f => [f.key, settings?.[f.key as keyof WebsiteSettings] ?? false])
  ) as Record<Key, boolean>

  const [checked, setChecked] = useState<Record<Key, boolean>>(initial)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

  function toggle(key: Key) {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }))
    setSuccess(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const result   = await saveSectionVisibility(formData)

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
    <div className="card" style={{ position: 'sticky', top: 'calc(var(--topbar-h) + 24px)' }}>
      <div className="section-title" style={{ marginBottom: '14px' }}>Section Visibility</div>
      <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '14px' }}>
        Toggle which sections appear on your public website.
      </p>
      <form onSubmit={handleSubmit}>
        {TOGGLE_FIELDS.map(f => (
          <label
            key={f.key}
            className="toggle-row"
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <div className="toggle-label">{f.label}</div>
            {/* Controlled checkbox — unchecked means field absent from FormData → false in action */}
            <input
              type="checkbox"
              name={f.key}
              value="on"
              checked={checked[f.key as Key]}
              onChange={() => toggle(f.key as Key)}
              style={{ display: 'none' }}
            />
            <span
              className={`badge ${checked[f.key as Key] ? 'badge-green' : 'badge-gray'}`}
              style={{ cursor: 'pointer', minWidth: 34, textAlign: 'center' }}
            >
              {checked[f.key as Key] ? 'On' : 'Off'}
            </span>
          </label>
        ))}

        {error && (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 'var(--r8)',
            background: '#fff0f0', color: '#c00', fontSize: 12,
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={pending}
          style={{ width: '100%', marginTop: '14px', justifyContent: 'center', opacity: pending ? 0.6 : 1 }}
        >
          {pending ? 'Saving…' : success ? '✓ Saved' : 'Save Visibility'}
        </button>
      </form>
    </div>
  )
}
