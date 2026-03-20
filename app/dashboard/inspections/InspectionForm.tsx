'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createInspection } from './actions'
import type { Vehicle, Customer, InspectionTemplate, TenantUser } from '@/lib/types'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', admin: 'Admin', advisor: 'Advisor',
  technician: 'Technician', viewer: 'Viewer',
}

interface Props {
  vehicles:             Vehicle[]
  customers:            Customer[]
  templates:            InspectionTemplate[]
  teamUsers:            TenantUser[]
  currentTenantUserId:  string | null
}

export default function InspectionForm({
  vehicles,
  customers,
  templates,
  teamUsers,
  currentTenantUserId,
}: Props) {
  const router  = useRouter()
  const [error,   setError]   = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result   = await createInspection(formData)

    if (result?.error) {
      setError(result.error)
      setPending(false)
      return
    }

    router.push('/dashboard/inspections')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="dash-content" style={{ maxWidth: 640 }}>
        <div className="card">
          <div className="section-title" style={{ marginBottom: 20 }}>New Inspection</div>

          <div className="form-grid">

            {/* Technician — defaults to current user, manual override allowed */}
            <div className="form-group span-2">
              <label className="field-label">
                Technician
                <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> (defaults to you)</span>
              </label>
              <select
                name="technician_id"
                className="field-select"
                defaultValue={currentTenantUserId ?? ''}
              >
                <option value="">— Unassigned —</option>
                {teamUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email}
                    {u.role ? ` · ${ROLE_LABELS[u.role] ?? u.role}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Customer */}
            <div className="form-group span-2">
              <label className="field-label">Customer</label>
              <select name="customer_id" className="field-select">
                <option value="">— No customer —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}{c.phone ? ` · ${c.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle */}
            <div className="form-group span-2">
              <label className="field-label">Vehicle</label>
              <select name="vehicle_id" className="field-select">
                <option value="">— No vehicle —</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {[v.year, v.make, v.model].filter(Boolean).join(' ')}
                    {v.license_plate ? ` (${v.license_plate})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Template */}
            {templates.length > 0 && (
              <div className="form-group span-2">
                <label className="field-label">
                  Template
                  <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> (optional)</span>
                </label>
                <select name="template_id" className="field-select">
                  <option value="">— No template —</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Notes */}
            <div className="form-group span-2">
              <label className="field-label">
                Notes
                <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> (optional)</span>
              </label>
              <textarea
                name="notes"
                className="field-textarea"
                rows={3}
                placeholder="Technician notes, customer concerns..."
              />
            </div>

          </div>

          {error && (
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 'var(--r8)',
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
              {pending ? 'Creating…' : 'Create Inspection'}
            </button>
            <a href="/dashboard/inspections" className="btn-ghost">Cancel</a>
          </div>
        </div>
      </div>
    </form>
  )
}
