'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createVehicleWithCustomer, updateVehicle } from './actions'
import type { Vehicle, CustomerRow } from '@/lib/types'

interface Props {
  vehicle?: Vehicle
  customers: CustomerRow[]
}

const ERROR_STYLE: React.CSSProperties = {
  marginBottom: '16px',
  padding: '10px 14px',
  background: 'rgba(239,68,68,.12)',
  border: '1px solid rgba(239,68,68,.25)',
  borderRadius: 'var(--r6)',
  color: '#fca5a5',
  fontSize: '13px',
}

const WARN_STYLE: React.CSSProperties = {
  marginBottom: '16px',
  padding: '10px 14px',
  background: 'rgba(250,173,20,.1)',
  border: '1px solid rgba(250,173,20,.35)',
  borderRadius: 'var(--r6)',
  color: '#faad14',
  fontSize: '13px',
}

interface DecodedVehicle {
  year: string; make: string; model: string; trim: string
}

export default function VehicleForm({ vehicle, customers }: Props) {
  const router = useRouter()

  // Form meta
  const [error,      setError]      = useState<string | null>(null)
  const [pending,    setPending]    = useState(false)
  const [dupWarning, setDupWarning] = useState<{ id: string; name: string } | null>(null)

  // Customer section
  const [customerMode, setCustomerMode] = useState<'select' | 'create'>('select')

  // VIN decode state
  const [vin,             setVin]             = useState(vehicle?.vin ?? '')
  const [decoding,        setDecoding]        = useState(false)
  const [decoded,         setDecoded]         = useState<DecodedVehicle | null>(null)
  const [decodeError,     setDecodeError]     = useState<string | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(!!vehicle) // always show manual on edit

  // ── VIN decode via NHTSA free API ────────────────────────────
  async function decodeVin() {
    const v = vin.trim().toUpperCase()
    if (v.length !== 17) {
      setDecodeError('VIN must be 17 characters. Enter fields manually below.')
      setShowManualEntry(true)
      return
    }

    setDecoding(true)
    setDecodeError(null)
    setDecoded(null)

    try {
      const res  = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${v}?format=json`
      )
      const json = await res.json()
      const r    = json?.Results?.[0]

      if (r && r.Make && r.Make !== 'Not Applicable') {
        setDecoded({ year: r.ModelYear ?? '', make: r.Make ?? '', model: r.Model ?? '', trim: r.Trim ?? '' })
        setShowManualEntry(true) // show fields pre-filled
      } else {
        setDecodeError('VIN not found in NHTSA database. Enter fields manually.')
        setShowManualEntry(true)
      }
    } catch {
      setDecodeError('VIN decode unavailable. Enter fields manually.')
      setShowManualEntry(true)
    } finally {
      setDecoding(false)
    }
  }

  // ── Submit ───────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    setDupWarning(null)

    const formData = new FormData(e.currentTarget)

    if (vehicle) {
      // Edit — simple update, no customer create logic
      const result = await updateVehicle(formData)
      if (result?.error) { setError(result.error); setPending(false); return }
      router.push('/dashboard/vehicles')
      router.refresh()
      return
    }

    // New vehicle
    const result = await createVehicleWithCustomer(formData)

    if (result?.existingCustomerId) {
      setDupWarning({ id: result.existingCustomerId, name: result.existingCustomerName! })
      setPending(false)
      return
    }

    if (result?.error) {
      setError(result.error)
      setPending(false)
      return
    }

    router.push('/dashboard/vehicles')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      {vehicle && <input type="hidden" name="id" value={vehicle.id} />}

      {/* Phone duplicate warning */}
      {dupWarning && (
        <div style={WARN_STYLE}>
          ⚠️ A customer with this phone number already exists:{' '}
          <strong>{dupWarning.name}</strong>.{' '}
          <Link
            href={`/dashboard/customers/${dupWarning.id}/edit`}
            style={{ color: 'inherit', textDecoration: 'underline' }}
          >
            View existing customer →
          </Link>
          <br />
          <span style={{ fontSize: 12 }}>
            Select that customer above, or use a different phone number.
          </span>
        </div>
      )}

      {error && <div style={ERROR_STYLE}>{error}</div>}

      {/* ── Customer Section ──────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
          Customer <span style={{ color: '#c00' }}>*</span>
        </div>

        {vehicle ? (
          /* Edit: simple customer dropdown */
          <div className="form-group">
            <select className="field-select" name="customer_id" defaultValue={vehicle.customer_id ?? ''}>
              <option value="">— No customer —</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}{c.phone ? ` · ${c.phone}` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : (
          /* New: select existing or create inline */
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                type="button"
                className={customerMode === 'select' ? 'btn-primary' : 'btn-ghost'}
                style={{ fontSize: 12, padding: '5px 12px' }}
                onClick={() => setCustomerMode('select')}
              >
                Select Existing
              </button>
              <button
                type="button"
                className={customerMode === 'create' ? 'btn-primary' : 'btn-ghost'}
                style={{ fontSize: 12, padding: '5px 12px' }}
                onClick={() => setCustomerMode('create')}
              >
                + Create New
              </button>
            </div>

            <input type="hidden" name="customer_mode" value={customerMode} />

            {customerMode === 'select' ? (
              <select className="field-select" name="customer_id" defaultValue="">
                <option value="">— Select customer —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}{c.phone ? ` · ${c.phone}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div
                style={{
                  border: '1px solid var(--border)', borderRadius: 'var(--r8)',
                  padding: 16, background: 'var(--surface-2)',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
                  Phone number is used to prevent duplicates. If a customer with this phone already exists, you will be prompted to select them.
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="field-label">First Name *</label>
                    <input name="new_first_name" className="field-input" placeholder="Jane" required={customerMode === 'create'} />
                  </div>
                  <div className="form-group">
                    <label className="field-label">Last Name</label>
                    <input name="new_last_name" className="field-input" placeholder="Smith" />
                  </div>
                  <div className="form-group">
                    <label className="field-label">Phone</label>
                    <input name="new_phone" className="field-input" type="tel" placeholder="(555) 000-0000" />
                  </div>
                  <div className="form-group">
                    <label className="field-label">Email</label>
                    <input name="new_email" className="field-input" type="email" placeholder="jane@example.com" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── VIN-first entry ───────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border-2)', paddingTop: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>Vehicle</div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="field-label">VIN</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              name="vin"
              className="field-input"
              style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', flex: 1, letterSpacing: '.04em' }}
              placeholder="17-character VIN"
              maxLength={17}
              value={vin}
              onChange={e => {
                const v = e.target.value.toUpperCase()
                setVin(v)
                if (decoded) { setDecoded(null); setDecodeError(null) }
              }}
            />
            {!vehicle && (
              <button
                type="button"
                className="btn-ghost"
                style={{ whiteSpace: 'nowrap', fontSize: 13 }}
                disabled={decoding || vin.trim().length < 5}
                onClick={decodeVin}
              >
                {decoding ? 'Decoding…' : 'Decode VIN'}
              </button>
            )}
          </div>
        </div>

        {/* Decode feedback */}
        {decoded && (
          <div style={{
            padding: '8px 12px', borderRadius: 'var(--r6)', marginBottom: 12,
            background: 'rgba(52,199,89,.1)', border: '1px solid rgba(52,199,89,.3)',
            color: '#34c759', fontSize: 12,
          }}>
            ✓ Decoded: {decoded.year} {decoded.make} {decoded.model} {decoded.trim}
          </div>
        )}
        {decodeError && (
          <div style={{
            padding: '8px 12px', borderRadius: 'var(--r6)', marginBottom: 12,
            background: 'rgba(250,173,20,.08)', border: '1px solid rgba(250,173,20,.3)',
            color: '#faad14', fontSize: 12,
          }}>
            {decodeError}
          </div>
        )}

        {/* Show/hide manual entry toggle */}
        {!showManualEntry && !vehicle && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
            Decode VIN to auto-fill fields, or{' '}
            <button
              type="button"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue-light)', fontSize: 12, padding: 0 }}
              onClick={() => setShowManualEntry(true)}
            >
              enter manually
            </button>
            .
          </div>
        )}

        {/* Vehicle fields */}
        {showManualEntry && (
          <div className="form-grid">
            <div className="form-group">
              <label className="field-label">Year</label>
              <input
                className="field-input" name="year" type="number"
                min="1900" max={new Date().getFullYear() + 1}
                defaultValue={decoded?.year ?? vehicle?.year ?? ''}
                key={`year-${decoded?.year}`}
                placeholder="2022"
              />
            </div>
            <div className="form-group">
              <label className="field-label">Make</label>
              <input
                className="field-input" name="make"
                defaultValue={decoded?.make ?? vehicle?.make ?? ''}
                key={`make-${decoded?.make}`}
                placeholder="Toyota"
              />
            </div>
            <div className="form-group">
              <label className="field-label">Model</label>
              <input
                className="field-input" name="model"
                defaultValue={decoded?.model ?? vehicle?.model ?? ''}
                key={`model-${decoded?.model}`}
                placeholder="Camry"
              />
            </div>
            <div className="form-group">
              <label className="field-label">Trim</label>
              <input
                className="field-input" name="trim"
                defaultValue={decoded?.trim ?? vehicle?.trim ?? ''}
                key={`trim-${decoded?.trim}`}
                placeholder="LE, SE…"
              />
            </div>
            <div className="form-group">
              <label className="field-label">License Plate</label>
              <input className="field-input" name="license_plate" defaultValue={vehicle?.license_plate ?? ''} placeholder="ABC1234" />
            </div>
            <div className="form-group">
              <label className="field-label">Color</label>
              <input className="field-input" name="color" defaultValue={vehicle?.color ?? ''} placeholder="White" />
            </div>
            <div className="form-group">
              <label className="field-label">Current Mileage</label>
              <input className="field-input" name="mileage" type="number" min="0" defaultValue={vehicle?.mileage ?? ''} placeholder="45000" />
            </div>
            <div className="form-group span-2">
              <label className="field-label">Notes</label>
              <textarea className="field-textarea" name="notes" defaultValue={vehicle?.notes ?? ''} placeholder="Any additional info…" />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Saving…' : vehicle ? 'Save Changes' : 'Add Vehicle'}
        </button>
        <Link href="/dashboard/vehicles" className="btn-ghost">Cancel</Link>
      </div>
    </form>
  )
}
