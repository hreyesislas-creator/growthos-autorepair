'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createEstimate } from '../actions'
import type { CustomerRow, Vehicle } from '@/lib/types'

interface Props {
  customers: CustomerRow[]
  vehicles:  Vehicle[]
}

export default function NewEstimateForm({ customers, vehicles }: Props) {
  const router = useRouter()

  const [customerId, setCustomerId] = useState('')
  const [vehicleId,  setVehicleId]  = useState('')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // When a customer is selected, only show their vehicles.
  // When no customer is selected, show all vehicles.
  const filteredVehicles = customerId
    ? vehicles.filter(v => v.customer_id === customerId)
    : vehicles

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const result = await createEstimate({
      creation_mode: 'manual_entry',
      inspection_id: null,
      customer_id:   customerId || null,
      vehicle_id:    vehicleId  || null,
    })

    if ('error' in result) {
      setError(result.error)
      setSaving(false)
      return
    }

    router.push(`/dashboard/estimates/${result.data.id}`)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: '#fee2e2', color: '#991b1b', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* Customer */}
      <div>
        <label style={{
          fontSize: 13, fontWeight: 600, color: 'var(--text)',
          display: 'block', marginBottom: 6,
        }}>
          Customer{' '}
          <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(optional)</span>
        </label>
        <select
          className="field-input"
          value={customerId}
          onChange={e => { setCustomerId(e.target.value); setVehicleId('') }}
          style={{ width: '100%', fontSize: 13 }}
        >
          <option value="">— Select customer —</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>
              {c.first_name} {c.last_name}{c.phone ? ` · ${c.phone}` : ''}
            </option>
          ))}
        </select>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
          You can add or update the customer in the estimate editor after creating.
        </p>
      </div>

      {/* Vehicle */}
      <div>
        <label style={{
          fontSize: 13, fontWeight: 600, color: 'var(--text)',
          display: 'block', marginBottom: 6,
        }}>
          Vehicle{' '}
          <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(optional)</span>
        </label>
        <select
          className="field-input"
          value={vehicleId}
          onChange={e => setVehicleId(e.target.value)}
          style={{ width: '100%', fontSize: 13 }}
        >
          <option value="">— Select vehicle —</option>
          {filteredVehicles.map(v => (
            <option key={v.id} value={v.id}>
              {[v.year, v.make, v.model].filter(Boolean).join(' ')}
              {v.license_plate ? ` · ${v.license_plate}` : ''}
            </option>
          ))}
        </select>
        {customerId && filteredVehicles.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
            No vehicles on file for this customer.{' '}
            <a href="/dashboard/vehicles/new" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              Add vehicle →
            </a>
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 4 }}>
        <button
          type="submit"
          className="btn-primary"
          disabled={saving}
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Creating…' : 'Create Estimate'}
        </button>
        <a
          href="/dashboard/estimates"
          style={{ fontSize: 13, color: 'var(--text-3)', textDecoration: 'none' }}
        >
          Cancel
        </a>
      </div>

    </form>
  )
}
