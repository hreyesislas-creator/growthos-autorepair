'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateBusinessProfile, updateWebsiteModules } from './actions'
import type { BusinessProfile, WebsiteSettings } from '@/lib/types'

// ── Business Profile Form ──────────────────────────────────────

interface ProfileFormProps {
  profile:   BusinessProfile | null
  readOnly?: boolean
}

export function BusinessProfileForm({ profile, readOnly = false }: ProfileFormProps) {
  const router  = useRouter()
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

  return (
    <form onSubmit={handleSubmit}>
      <fieldset
        disabled={readOnly}
        style={{ border: 'none', padding: 0, margin: 0, minWidth: 0 }}
      >
        <div className="card">
        <div className="section-title" style={{ marginBottom: '16px' }}>Business Profile</div>

        {/* Business Identity */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-3)', marginBottom: '12px' }}>
            Business Identity
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="field-label">Business Name</label>
              <input
                name="business_name"
                className="field-input"
                defaultValue={profile?.business_name ?? ''}
                placeholder="Acme Auto Repair"
              />
            </div>
            <div className="form-group">
              <label className="field-label">Phone</label>
              <input
                name="phone"
                className="field-input"
                defaultValue={profile?.phone ?? ''}
                placeholder="(555) 555-5555"
              />
            </div>
            <div className="form-group">
              <label className="field-label">Email</label>
              <input
                name="email"
                className="field-input"
                defaultValue={profile?.email ?? ''}
                placeholder="info@shop.com"
              />
            </div>
            <div className="form-group">
              <label className="field-label">Website</label>
              <input
                name="website"
                className="field-input"
                defaultValue={profile?.website ?? ''}
                placeholder="https://acmeauto.com"
              />
            </div>
            <div className="form-group">
              <label className="field-label">Address Line 1</label>
              <input
                name="address_line_1"
                className="field-input"
                defaultValue={(profile as any)?.address_line_1 ?? ''}
                placeholder="123 Main St"
              />
            </div>
            <div className="form-group">
              <label className="field-label">Address Line 2</label>
              <input
                name="address_line_2"
                className="field-input"
                defaultValue={(profile as any)?.address_line_2 ?? ''}
                placeholder="Suite 100 (optional)"
              />
            </div>
            <div className="form-group">
              <label className="field-label">City</label>
              <input
                name="city"
                className="field-input"
                defaultValue={(profile as any)?.city ?? ''}
                placeholder="Banning"
              />
            </div>
            <div className="form-group">
              <label className="field-label">State</label>
              <input
                name="state"
                className="field-input"
                defaultValue={(profile as any)?.state ?? ''}
                placeholder="CA"
              />
            </div>
            <div className="form-group">
              <label className="field-label">ZIP Code</label>
              <input
                name="zip_code"
                className="field-input"
                defaultValue={(profile as any)?.zip_code ?? ''}
                placeholder="92220"
              />
            </div>
          </div>
        </div>

        {/* Legal / Licensing */}
        <div style={{ marginBottom: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-2)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-3)', marginBottom: '12px' }}>
            Legal & Licensing
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="field-label">BAR License</label>
              <input
                name="bar_license"
                className="field-input"
                defaultValue={profile?.bar_license ?? ''}
                placeholder="e.g., AB123456"
              />
            </div>
            <div className="form-group">
              <label className="field-label">Seller&apos;s Permit</label>
              <input
                name="seller_permit"
                className="field-input"
                defaultValue={profile?.seller_permit ?? ''}
                placeholder="e.g., 12-3456789-0"
              />
            </div>
          </div>
        </div>

        {/* Document Defaults */}
        <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-2)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-3)', marginBottom: '12px' }}>
            Document Defaults
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="field-label">Tax Rate (%)</label>
              <input
                name="tax_rate"
                className="field-input"
                type="number"
                step="0.01"
                defaultValue={profile?.tax_rate ? (parseFloat(profile.tax_rate.toString()) * 100).toFixed(4) : ''}
                placeholder="8.75"
              />
            </div>
            <div className="form-group">
              <label className="field-label">Labor Rate ($/hr)</label>
              <input
                name="labor_rate"
                className="field-input"
                type="number"
                step="0.01"
                defaultValue={profile?.labor_rate ?? ''}
                placeholder="85.00"
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="field-label">Warranty Text</label>
              <textarea
                name="warranty_text"
                className="field-input"
                style={{ minHeight: '80px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                defaultValue={profile?.warranty_text ?? ''}
                placeholder="e.g., 'All work covered by 12-month warranty'"
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="field-label">Invoice Terms</label>
              <input
                name="invoice_terms"
                className="field-input"
                defaultValue={profile?.invoice_terms ?? ''}
                placeholder="e.g., 'Net 30' or 'Due upon receipt'"
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="field-label">Invoice Footer</label>
              <textarea
                name="invoice_footer"
                className="field-input"
                style={{ minHeight: '80px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                defaultValue={profile?.invoice_footer ?? ''}
                placeholder="e.g., 'Thank you for your business! Please call with any questions.'"
              />
            </div>
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

        {!readOnly && (
          <button
            type="submit"
            className="btn-primary"
            disabled={pending}
            style={{ marginTop: '16px', opacity: pending ? 0.6 : 1 }}
          >
            {pending ? 'Saving…' : success ? '✓ Saved' : 'Save Changes'}
          </button>
        )}
      </div>
      </fieldset>
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
  settings:   WebsiteSettings | null
  readOnly?: boolean
}

export function WebsiteModulesForm({ settings, readOnly = false }: ModulesFormProps) {
  const router = useRouter()

  const initial = Object.fromEntries(
    MODULE_FIELDS.map(f => [f.key, settings?.[f.key as keyof WebsiteSettings] ?? false])
  ) as Record<ModuleKey, boolean>

  const [checked, setChecked] = useState<Record<ModuleKey, boolean>>(initial)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

  function toggle(key: ModuleKey) {
    if (readOnly) return
    setChecked(prev => ({ ...prev, [key]: !prev[key] }))
    setSuccess(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (readOnly) return
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
      <fieldset
        disabled={readOnly}
        style={{ border: 'none', padding: 0, margin: 0, minWidth: 0 }}
      >
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

        {!readOnly && (
          <button
            type="submit"
            className="btn-primary"
            disabled={pending}
            style={{ marginTop: '14px', opacity: pending ? 0.6 : 1 }}
          >
            {pending ? 'Saving…' : success ? '✓ Saved' : 'Save Modules'}
          </button>
        )}
      </div>
      </fieldset>
    </form>
  )
}
