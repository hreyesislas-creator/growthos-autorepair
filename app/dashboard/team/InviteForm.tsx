'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { inviteUser } from './actions'

const ROLES = [
  { value: 'admin',      label: 'Admin — full access except billing' },
  { value: 'advisor',    label: 'Service Advisor — appointments & customers' },
  { value: 'technician', label: 'Technician — inspections & vehicles' },
  { value: 'viewer',     label: 'Viewer — read-only' },
]

export default function InviteForm() {
  const router  = useRouter()
  const [error,   setError]   = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result   = await inviteUser(formData)

    if (result?.error) {
      setError(result.error)
      setPending(false)
      return
    }

    router.push('/dashboard/team')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="dash-content" style={{ maxWidth: 560 }}>
        <div className="card">
          <div className="section-title" style={{ marginBottom: 4 }}>Invite Team Member</div>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>
            An invitation email will be sent. The team member will appear in your roster
            once they accept the invite.
          </p>

          <div className="form-grid">
            <div className="form-group span-2">
              <label className="field-label">Email Address <span style={{ color: '#c00' }}>*</span></label>
              <input
                name="email"
                type="email"
                className="field-input"
                placeholder="technician@yourshop.com"
                required
              />
            </div>

            <div className="form-group span-2">
              <label className="field-label">Full Name <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
              <input
                name="full_name"
                className="field-input"
                placeholder="Jane Smith"
              />
            </div>

            <div className="form-group span-2">
              <label className="field-label">Role <span style={{ color: '#c00' }}>*</span></label>
              <select name="role" className="field-select" defaultValue="advisor" required>
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group span-2">
              <label className="field-label">Dashboard Language</label>
              <select name="language_pref" className="field-select" defaultValue="en">
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>

          <div style={{
            marginTop: 16, padding: '10px 14px', borderRadius: 'var(--r8)',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            fontSize: 12, color: 'var(--text-3)',
          }}>
            ℹ️ Invite delivery requires <code style={{ fontFamily: 'var(--font-mono)' }}>SUPABASE_SERVICE_ROLE_KEY</code> to be set in your server environment.
          </div>

          {error && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 'var(--r8)',
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
              {pending ? 'Sending Invite…' : 'Send Invite'}
            </button>
            <a href="/dashboard/team" className="btn-ghost">Cancel</a>
          </div>
        </div>
      </div>
    </form>
  )
}
