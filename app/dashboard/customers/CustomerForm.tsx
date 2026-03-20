'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createCustomerAndVehicle, updateCustomer } from './actions'
import type { Customer } from '@/lib/types'

interface Props {
  customer?: Customer
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
  year:  string
  make:  string
  model: string
  trim:  string
}

export default function CustomerForm({ customer }: Props) {
  const router = useRouter()

  // Form meta
  const [error,   setError]   = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [dupWarning, setDupWarning] = useState<{ id: string; name: string } | null>(null)

  // Vehicle section state
  const [addVehicle,      setAddVehicle]      = useState(false)
  const [vin,             setVin]             = useState('')
  const [decoding,        setDecoding]        = useState(false)
  const [decoded,         setDecoded]         = useState<DecodedVehicle | null>(null)
  const [decodeError,     setDecodeError]     = useState<string | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)

  // ── VIN decode ───────────────────────────────────────────────
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
        setDecoded({
          year:  r.ModelYear ?? '',
          make:  r.Make      ?? '',
          model: r.Model     ?? '',
          trim:  r.Trim      ?? '',
        })
        setShowManualEntry(false)
      } else {
        setDecodeError('VIN not found in NHTSA database. Enter fields manually below.')
        setShowManualEntry(true)
      }
    } catch {
      setDecodeError('VIN decode unavailable. Enter fields manually below.')
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

    if (customer) {
      // Edit path — no vehicle section for existing customers
      const result = await updateCustomer(formData)
      if (result?.error) { setError(result.error); setPending(false); return }
      router.push('/dashboard/customers')
      router.refresh()
      return
    }

    // New customer path — use combined action
    const result = await createCustomerAndVehicle(formData)

    if (result?.existingCustomerId) {
      // Phone duplicate detected
      setDupWarning({ id: result.existingCustomerId, name: result.existingCustomerName! })
      setPending(false)
      return
    }

    if (result?.error) {
      setError(result.error)
      setPending(false)
      return
    }

    router.push('/dashboard/customers')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      {customer && <input type="hidden" name="id" value={customer.id} />}

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
            If this is a different customer, change the phone number or leave it blank.
          </span>
        </div>
      )}

      {error && <div style={ERROR_STYLE}>{error}</div>}

      {/* ── Customer fields ─────────────────────────────── */}
      <div className="form-grid">
        <div className="form-group">
          <label className="field-label">First Name *</label>
          <input className="field-input" name="first_name" defaultValue={customer?.first_name ?? ''} required placeholder="Jane" />
        </div>
        <div className="form-group">
          <label className="field-label">Last Name *</label>
          <input className="field-input" name="last_name"  defaultValue={customer?.last_name  ?? ''} required placeholder="Smith" />
        </div>

        <div className="form-group">
          <label className="field-label">Phone</label>
          <input className="field-input" name="phone" type="tel" defaultValue={customer?.phone ?? ''} placeholder="(555) 000-0000" />
        </div>
        <div className="form-group">
          <label className="field-label">Email</label>
          <input className="field-input" name="email" type="email" defaultValue={customer?.email ?? ''} placeholder="jane@example.com" />
        </div>

        <div className="form-group span-2">
          <label className="field-label">Address</label>
          <input className="field-input" name="address" defaultValue={customer?.address ?? ''} placeholder="123 Main St, Banning, CA 92220" />
        </div>

        <div className="form-group">
          <label className="field-label">Source</label>
          <select className="field-select" name="source" defaultValue={customer?.source ?? ''}>
            <option value="">— Select —</option>
            <option value="walk_in">Walk In</option>
            <option value="phone">Phone</option>
            <option value="referral">Referral</option>
            <option value="online">Online</option>
            <option value="returning">Returning</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group span-2">
          <label className="field-label">Notes</label>
          <textarea className="field-textarea" name="notes" defaultValue={customer?.notes ?? ''} placeholder="Any additional info…" />
        </div>
      </div>

      {/* ── Optional vehicle section (new customer only) ─── */}
      {!customer && (
        <div style={{ marginTop: 24 }}>
          {!addVehicle ? (
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 13 }}
              onClick={() => { setAddVehicle(true) }}
            >
              + Add vehicle for this customer
            </button>
          ) : (
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--r8)',
              padding: '20px',
              background: 'var(--surface-2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Vehicle (optional)</div>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: 12, padding: '3px 8px' }}
                  onClick={() => { setAddVehicle(false); setDecoded(null); setDecodeError(null); setShowManualEntry(false) }}
                >
                  Remove
                </button>
              </div>

              {/* hidden field so action knows to create vehicle */}
              <input type="hidden" name="add_vehicle" value="yes" />

              {/* VIN-first entry */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="field-label">VIN</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    name="vin"
                    className="field-input"
                    style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', flex: 1 }}
                    placeholder="17-character VIN"
                    maxLength={17}
                    value={vin}
                    onChange={e => {
                      setVin(e.target.value.toUpperCase())
                      setDecoded(null)
                      setDecodeError(null)
                      setShowManualEntry(false)
                    }}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ whiteSpace: 'nowrap', fontSize: 13 }}
                    disabled={decoding || vin.trim().length < 5}
                    onClick={decodeVin}
                  >
                    {decoding ? 'Decoding…' : 'Decode VIN'}
                  </button>
                </div>
              </div>

              {/* Decode result banner */}
              {decoded && (
                <div style={{
                  padding: '8px 12px', borderRadius: 'var(--r6)',
                  background: 'rgba(52,199,89,.1)', border: '1px solid rgba(52,199,89,.3)',
                  color: '#34c759', fontSize: 12, marginBottom: 12,
                }}>
                  ✓ Decoded: {decoded.year} {decoded.make} {decoded.model} {decoded.trim}
                </div>
              )}

              {decodeError && (
                <div style={{
                  padding: '8px 12px', borderRadius: 'var(--r6)',
                  background: 'rgba(250,173,20,.08)', border: '1px solid rgba(250,173,20,.3)',
                  color: '#faad14', fontSize: 12, marginBottom: 12,
                }}>
                  {decodeError}
                </div>
              )}

              {/* Vehicle fields — populated from decode or manual */}
              {(decoded || showManualEntry) && (
                <div className="form-grid" style={{ marginTop: 4 }}>
                  <div className="form-group">
                    <label className="field-label">Year</label>
                    <input
                      name="year"
                      className="field-input"
                      type="number"
                      min={1900}
                      max={new Date().getFullYear() + 1}
                      defaultValue={decoded?.year ?? ''}
                      key={decoded?.year}
                      placeholder="2020"
                    />
                  </div>
                  <div className="form-group">
                    <label className="field-label">Make</label>
                    <input
                      name="make"
                      className="field-input"
                      defaultValue={decoded?.make ?? ''}
                      key={decoded?.make}
                      placeholder="Toyota"
                    />
                  </div>
                  <div className="form-group">
                    <label className="field-label">Model</label>
                    <input
                      name="model"
                      className="field-input"
                      defaultValue={decoded?.model ?? ''}
                      key={decoded?.model}
                      placeholder="Camry"
                    />
                  </div>
                  <div className="form-group">
                    <label className="field-label">Trim</label>
                    <input
                      name="vtrim"
                      className="field-input"
                      defaultValue={decoded?.trim ?? ''}
                      key={decoded?.trim}
                      placeholder="LE"
                    />
                  </div>
                  <div className="form-group">
                    <label className="field-label">Color</label>
                    <input name="color" className="field-input" placeholder="Silver" />
                  </div>
                  <div className="form-group">
                    <label className="field-label">License Plate</label>
                    <input name="license_plate" className="field-input" placeholder="7ABC123" />
                  </div>
                  <div className="form-group">
                    <label className="field-label">Mileage</label>
                    <input name="mileage" className="field-input" type="number" placeholder="85000" />
                  </div>
                  <div className="form-group span-2">
                    <label className="field-label">Vehicle Notes</label>
                    <textarea name="vehicle_notes" className="field-textarea" rows={2} placeholder="Known issues, previous repairs…" />
                  </div>
                </div>
              )}

              {/* If VIN not decoded and no error, prompt */}
              {!decoded && !showManualEntry && !decodeError && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                  Enter a VIN and click Decode VIN, or{' '}
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue-light)', fontSize: 12, padding: 0 }}
                    onClick={() => setShowManualEntry(true)}
                  >
                    enter vehicle details manually
                  </button>
                  .
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Saving…' : customer ? 'Save Changes' : 'Add Customer'}
        </button>
        <Link href="/dashboard/customers" className="btn-ghost">Cancel</Link>
      </div>
    </form>
  )
}
