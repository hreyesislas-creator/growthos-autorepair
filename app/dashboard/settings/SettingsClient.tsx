'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateBusinessProfile, updateWebsiteModules } from './actions'
import type { BusinessProfile, WebsiteSettings } from '@/lib/types'

// ── Business Profile Form ──────────────────────────────────────

interface ProfileFormProps {
  profile: BusinessProfile | null
}

export function BusinessProfileForm({ profile }: ProfileFormProps) {
  const router  = useRouter()
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const result   = await updateBusinessProfile(formData)

    if (result?.error) {
      setError(result.error)
      setPending(false)
      return
    }

    setSuccess(true)
    setPending(false)
    router.refresh()
  }

  const fields: { label: string; name: string; value?: string | null; placeholder?: string }[] = [
    { label: 'Business Name', name: 'business_name', value: profile?.business_name,  placeholder: 'Acme Auto Repair' },
    { label: 'Phone',         name: 'phone',         value: profile?.phone,          placeholder: '(555) 555-5555' },
    { label: 'Email',         name: 'email',         value: profile?.email,          placeholder: 'info@shop.com' },
    { label: 'Address',       name: 'address_street',value: profile?.address_street, placeholder: '123 Main St' },
    { label: 'City',          name: 'address_city',  value: profile?.address_city,   placeholder: 'Banning' },
    { label: 'State',         name: 'address_state', value: profile?.address_state,  placeholder: 'CA' },
    { label: 'ZIP',           name: 'address_zip',   value: profile?.address_zip,    placeholder: '92220' },
  ]

  return (
    <form onSubmit={handleSubmit}>
      <div className="card">
        <div className="section-title" style={{ marginBottom: '16px' }}>Business Profile</div>
        <div className="form-grid">
          {fields.map(f => (
            <div key={f.name} className="form-group">
              <label className="field-label">{f.label}</label>
              <input
                name={f.name}
                className="field-input"
                defaultValue={f.value ?? ''}
                placeholder={f.placeholder}
              />
            </div>
          ))}
        </div>

        {error && (
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 'var(--r8)',
            background: '#fff0f0', color: '#c00', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={pending}
          style={{ marginTop: '16px', opacity: pending ? 0.6 : 1 }}
        >
          {pending ? 'Saving…' : success ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

// ── Website Modules Toggle Form ───────────────────────────────

const MODULE_FIELDS = [
  { key: 'show_hero',               label: 'Hero Section' },
  { key: 'show_services',           label: 'Services' },
  { key: 'show_specials',           label: 'Specials' },
  { key: 'show_tire_brands',        label: 'Tire Brands' },
  { key: 'show_vehicles_we_service',label: 'Vehicles We Service' },
  { key: 'show_warranty',           label: 'Warranty' },
  { key: 'show_gallery',            label: 'Gallery' },
  { key: 'show_reviews',            label: 'Reviews' },
  { key: 'show_financing',          label: 'Financing' },
] as const

type ModuleKey = typeof MODULE_FIELDS[number]['key']

interface ModulesFormProps {
  settings: WebsiteSettings | null
}

export function WebsiteModulesForm({ settings }: ModulesFormProps) {
  const router = useRouter()

  const initial = Object.fromEntries(
    MODULE_FIELDS.map(f => [f.key, settings?.[f.key as keyof WebsiteSettings] ?? false])
  ) as Record<ModuleKey, boolean>

  const [checked, setChecked] = useState<Record<ModuleKey, boolean>>(initial)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

  function toggle(key: ModuleKey) {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }))
    setSuccess(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const result   = await updateWebsiteModules(formData)

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
      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="section-title" style={{ marginBottom: '12px' }}>Website Modules</div>
        <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '12px' }}>
          Toggle sections visible on your public website.
        </p>
        {MODULE_FIELDS.map(m => (
          <label
            key={m.key}
            className="toggle-row"
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <div className="toggle-label">{m.label}</div>
            {/* Controlled checkbox — unchecked means field absent from FormData → false in action */}
            <input
              type="checkbox"
              name={m.key}
              value="on"
              checked={checked[m.key as ModuleKey]}
              onChange={() => toggle(m.key as ModuleKey)}
              style={{ display: 'none' }}
            />
            <span
              className={`badge ${checked[m.key as ModuleKey] ? 'badge-green' : 'badge-gray'}`}
              style={{ cursor: 'pointer', minWidth: 34, textAlign: 'center' }}
            >
              {checked[m.key as ModuleKey] ? 'On' : 'Off'}
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
          style={{ marginTop: '14px', opacity: pending ? 0.6 : 1 }}
        >
          {pending ? 'Saving…' : success ? '✓ Saved' : 'Save Modules'}
        </button>
      </div>
    </form>
  )
}
