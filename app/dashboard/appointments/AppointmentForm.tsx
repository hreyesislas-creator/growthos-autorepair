'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createAppointment, updateAppointment } from './actions'
import type { AppointmentRow, CustomerRow, Vehicle } from '@/lib/types'

interface Props {
  appointment?: AppointmentRow
  customers: CustomerRow[]
  vehicles: Vehicle[]
}

const STATUS_OPTIONS = [
  { value: 'pending',     label: 'Pending' },
  { value: 'confirmed',   label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
  { value: 'no_show',     label: 'No Show' },
]

const SOURCE_OPTIONS = [
  { value: 'walk_in',  label: 'Walk In' },
  { value: 'phone',    label: 'Phone' },
  { value: 'online',   label: 'Online' },
  { value: 'referral', label: 'Referral' },
  { value: 'other',    label: 'Other' },
]

const ERROR_STYLE: React.CSSProperties = {
  marginBottom: '16px',
  padding: '10px 14px',
  background: 'rgba(239,68,68,.12)',
  border: '1px solid rgba(239,68,68,.25)',
  borderRadius: 'var(--r6)',
  color: '#fca5a5',
  fontSize: '13px',
}

export default function AppointmentForm({ appointment, customers, vehicles }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  // Track selected customer to filter vehicle list
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    appointment?.customer_id ?? '',
  )

  const filteredVehicles = selectedCustomerId
    ? vehicles.filter(v => v.customer_id === selectedCustomerId)
    : vehicles

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = appointment
      ? await updateAppointment(formData)
      : await createAppointment(formData)
    if (result?.error) {
      setError(result.error)
      setPending(false)
    } else {
      router.push('/dashboard/appointments')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {appointment && <input type="hidden" name="id" value={appointment.id} />}

      {error && <div style={ERROR_STYLE}>{error}</div>}

      <div className="form-grid">
        {/* Customer — controlled so vehicle list filters reactively */}
        <div className="form-group span-2">
          <label className="field-label">Customer</label>
          <select
            className="field-select"
            name="customer_id"
            value={selectedCustomerId}
            onChange={e => setSelectedCustomerId(e.target.value)}
          >
            <option value="">— No customer —</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}{c.phone ? ` · ${c.phone}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group span-2">
          <label className="field-label">Vehicle</label>
          <select
            className="field-select"
            name="vehicle_id"
            defaultValue={appointment?.vehicle_id ?? ''}
          >
            <option value="">— No vehicle —</option>
            {filteredVehicles.map(v => (
              <option key={v.id} value={v.id}>
                {[v.year, v.make, v.model].filter(Boolean).join(' ')}
                {v.license_plate ? ` · ${v.license_plate}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="field-label">Date</label>
          <input
            className="field-input"
            name="appointment_date"
            type="date"
            defaultValue={appointment?.appointment_date ?? ''}
          />
        </div>
        <div className="form-group">
          <label className="field-label">Time</label>
          <input
            className="field-input"
            name="appointment_time"
            type="time"
            defaultValue={appointment?.appointment_time?.slice(0, 5) ?? ''}
          />
        </div>

        <div className="form-group span-2">
          <label className="field-label">Requested Service</label>
          <input
            className="field-input"
            name="requested_service"
            defaultValue={appointment?.requested_service ?? ''}
            placeholder="Oil change, brake inspection…"
          />
        </div>

        <div className="form-group">
          <label className="field-label">Status</label>
          <select
            className="field-select"
            name="status"
            defaultValue={appointment?.status ?? 'pending'}
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="field-label">Source</label>
          <select
            className="field-select"
            name="source"
            defaultValue={appointment?.source ?? 'phone'}
          >
            {SOURCE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group span-2">
          <label className="field-label">Notes</label>
          <textarea
            className="field-textarea"
            name="notes"
            defaultValue={appointment?.notes ?? ''}
            placeholder="Any additional notes…"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Saving…' : appointment ? 'Save Changes' : 'Book Appointment'}
        </button>
        <Link href="/dashboard/appointments" className="btn-ghost">Cancel</Link>
      </div>
    </form>
  )
}
