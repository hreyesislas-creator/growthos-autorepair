'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { PartsCatalog, ServiceCatalog } from '@/lib/types'
import { createService, updateService, deleteService } from './actions'

interface PartRow {
  key: string
  name: string
  quantity: string
  unitCost: string
  /** From Parts Catalog picker — shown in UI only; not saved in default_parts JSON */
  partNumberHint?: string
  /** From Parts Catalog default list price — shown in UI only */
  catalogListPriceHint?: string
}

function newPartKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `part-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Reads `default_parts` from DB into editable rows (same JSON shape: `{ name, quantity, unit_cost }`). */
function rowsFromDefaultParts(parts: unknown): PartRow[] {
  let arr: unknown = parts
  if (parts == null) return []
  if (typeof parts === 'string') {
    const t = parts.trim()
    if (t === '') return []
    try {
      arr = JSON.parse(t) as unknown
    } catch {
      return []
    }
  }
  if (!Array.isArray(arr)) return []
  return arr.map((p) => {
    if (!p || typeof p !== 'object') return null
    const o = p as Record<string, unknown>
    return {
      key: newPartKey(),
      name: String(o.name ?? ''),
      quantity: String(o.quantity ?? 1),
      unitCost: String(o.unit_cost ?? 0),
    } as PartRow
  }).filter((r): r is PartRow => r != null)
}

/** Writes the same array shape stored in `service_catalog.default_parts`. */
function buildDefaultPartsPayload(rows: PartRow[]): { name: string; quantity: number; unit_cost: number }[] {
  return rows
    .map(r => {
      const name = r.name.trim()
      const qRaw = r.quantity.trim()
      const cRaw = r.unitCost.trim()
      const quantity = qRaw === '' ? 1 : Number(qRaw)
      const unit_cost = cRaw === '' ? 0 : Number(cRaw)
      return { name, quantity, unit_cost }
    })
    .filter(r => r.name.length > 0)
}

export default function ServiceCatalogForm({
  initial,
  catalogParts = [],
}: {
  initial: ServiceCatalog | null
  catalogParts?: PartsCatalog[]
}) {
  const router = useRouter()
  const isNew = initial == null

  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [laborHours, setLaborHours] = useState(
    initial?.default_labor_hours != null ? String(initial.default_labor_hours) : '1',
  )
  const [laborRate, setLaborRate] = useState(
    initial?.default_labor_rate != null ? String(initial.default_labor_rate) : '',
  )
  const [partRows, setPartRows] = useState<PartRow[]>(() => rowsFromDefaultParts(initial?.default_parts ?? []))
  const [notes, setNotes] = useState(initial?.default_notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [catalogPickerOpen, setCatalogPickerOpen] = useState(false)

  function addPartRow() {
    setPartRows(prev => [...prev, { key: newPartKey(), name: '', quantity: '1', unitCost: '0' }])
  }

  function addPartFromCatalog(part: PartsCatalog) {
    const cost =
      part.default_unit_cost != null && !Number.isNaN(Number(part.default_unit_cost))
        ? String(part.default_unit_cost)
        : '0'
    const listPrice =
      part.default_unit_price != null && !Number.isNaN(Number(part.default_unit_price))
        ? String(part.default_unit_price)
        : undefined
    setPartRows(prev => [
      ...prev,
      {
        key: newPartKey(),
        name: part.name,
        quantity: '1',
        unitCost: cost,
        partNumberHint: part.part_number?.trim() || undefined,
        catalogListPriceHint: listPrice,
      },
    ])
    setCatalogPickerOpen(false)
  }

  function removePartRow(key: string) {
    setPartRows(prev => prev.filter(r => r.key !== key))
  }

  function updatePartRow(key: string, field: keyof Pick<PartRow, 'name' | 'quantity' | 'unitCost'>, value: string) {
    setPartRows(prev => prev.map(r => {
      if (r.key !== key) return r
      const next: PartRow = { ...r, [field]: value }
      if (field === 'name') {
        delete next.partNumberHint
        delete next.catalogListPriceHint
      }
      return next
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const defaultParts = buildDefaultPartsPayload(partRows)
    for (const p of defaultParts) {
      if (!Number.isFinite(p.quantity) || p.quantity < 0) {
        setError('Each part needs a valid quantity (0 or greater).')
        setBusy(false)
        return
      }
      if (!Number.isFinite(p.unit_cost) || p.unit_cost < 0) {
        setError('Each part needs a valid unit cost (0 or greater).')
        setBusy(false)
        return
      }
    }

    const hoursParsed = laborHours.trim() === '' ? null : parseFloat(laborHours)
    const rateParsed = laborRate.trim() === '' ? null : parseFloat(laborRate)

    if (isNew) {
      const r = await createService({
        name,
        description: description || null,
        default_labor_hours: hoursParsed,
        default_labor_rate: rateParsed,
        default_parts: defaultParts,
        default_notes: notes || null,
      })
      setBusy(false)
      if ('error' in r) {
        setError(r.error)
        return
      }
      router.push('/dashboard/services')
      router.refresh()
      return
    }

    const err = await updateService(initial.id, {
      name,
      description: description || null,
      default_labor_hours: hoursParsed,
      default_labor_rate: rateParsed,
      default_parts: defaultParts,
      default_notes: notes || null,
    })
    setBusy(false)
    if (err) {
      setError(err.error)
      return
    }
    router.push('/dashboard/services')
    router.refresh()
  }

  async function handleDeactivate() {
    if (!initial || !confirm('Remove this job template? It will no longer appear when building estimates.')) {
      return
    }
    setBusy(true)
    setError(null)
    const err = await deleteService(initial.id)
    setBusy(false)
    if (err) {
      setError(err.error)
      return
    }
    router.push('/dashboard/services')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: 20, maxWidth: 640 }}>
      {error && (
        <div style={{
          marginBottom: 16,
          padding: '10px 12px',
          borderRadius: 8,
          background: '#fee2e2',
          color: '#991b1b',
          fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <label className="field-label" style={{ display: 'block', marginBottom: 4 }}>Name</label>
      <input
        className="field-input"
        value={name}
        onChange={e => setName(e.target.value)}
        required
        style={{ width: '100%', marginBottom: 14 }}
      />

      <label className="field-label" style={{ display: 'block', marginBottom: 4 }}>Description</label>
      <textarea
        className="field-input"
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={2}
        style={{ width: '100%', marginBottom: 14, resize: 'vertical' }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="field-label" style={{ display: 'block', marginBottom: 4 }}>Default labor hours</label>
          <input
            className="field-input"
            type="number"
            step="0.1"
            min="0"
            value={laborHours}
            onChange={e => setLaborHours(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label className="field-label" style={{ display: 'block', marginBottom: 4 }}>Default labor rate ($/hr)</label>
          <input
            className="field-input"
            type="number"
            step="0.01"
            min="0"
            value={laborRate}
            onChange={e => setLaborRate(e.target.value)}
            placeholder="Shop default if empty"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div className="field-label" style={{ marginBottom: 6 }}>Included Parts</div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 12px', lineHeight: 1.45 }}>
          These parts will be added automatically when this job template is inserted into an estimate.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {partRows.map(row => (
            <div
              key={row.key}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 72px 88px auto',
                gap: 8,
                alignItems: 'start',
              }}
            >
              <div>
                <label className="field-label" style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Part name</label>
                <input
                  className="field-input"
                  value={row.name}
                  onChange={e => updatePartRow(row.key, 'name', e.target.value)}
                  placeholder="e.g. Oil filter"
                  style={{ width: '100%', fontSize: 13 }}
                />
                {(row.partNumberHint || row.catalogListPriceHint) && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.35 }}>
                    {row.partNumberHint ? <>Part #: {row.partNumberHint}</> : null}
                    {row.partNumberHint && row.catalogListPriceHint ? ' · ' : null}
                    {row.catalogListPriceHint != null ? (
                      <>Catalog list ${Number(row.catalogListPriceHint).toFixed(2)}</>
                    ) : null}
                  </div>
                )}
              </div>
              <div>
                <label className="field-label" style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Qty</label>
                <input
                  className="field-input"
                  type="number"
                  step="0.001"
                  min="0"
                  value={row.quantity}
                  onChange={e => updatePartRow(row.key, 'quantity', e.target.value)}
                  style={{ width: '100%', fontSize: 13 }}
                />
              </div>
              <div>
                <label className="field-label" style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Unit cost</label>
                <input
                  className="field-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.unitCost}
                  onChange={e => updatePartRow(row.key, 'unitCost', e.target.value)}
                  style={{ width: '100%', fontSize: 13 }}
                />
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => removePartRow(row.key)}
                style={{ fontSize: 12, padding: '6px 10px', color: '#b91c1c', marginTop: 22 }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 12 }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={addPartRow}
            style={{ fontSize: 12 }}
          >
            + Add Part
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => { setError(null); setCatalogPickerOpen(true) }}
            style={{ fontSize: 12 }}
          >
            Pick from Parts Catalog
          </button>
        </div>
      </div>

      <label className="field-label" style={{ display: 'block', marginBottom: 4 }}>Default line notes</label>
      <textarea
        className="field-input"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={2}
        placeholder="Copied to the estimate line when this job template is added"
        style={{ width: '100%', marginBottom: 20, resize: 'vertical' }}
      />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : isNew ? 'Create job template' : 'Save changes'}
        </button>
        <Link href="/dashboard/services" className="btn-ghost">
          Cancel
        </Link>
        {!isNew && (
          <button
            type="button"
            className="btn-ghost"
            style={{ color: '#b91c1c' }}
            disabled={busy}
            onClick={handleDeactivate}
          >
            Remove template
          </button>
        )}
      </div>

      {catalogPickerOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}
        onClick={() => setCatalogPickerOpen(false)}
        role="presentation"
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 420,
              maxHeight: '75vh',
              margin: 16,
              padding: 20,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="parts-picker-title"
          >
            <h3
              id="parts-picker-title"
              style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}
            >
              Pick from Parts Catalog
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.45 }}>
              Adds a row with name and default unit cost. You can edit quantity and cost before saving.
            </p>
            {catalogParts.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
                No active parts in your catalog. Add parts under{' '}
                <strong>Parts</strong> in the sidebar first.
              </p>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {catalogParts.map(part => (
                  <button
                    key={part.id}
                    type="button"
                    className="btn-ghost"
                    onClick={() => addPartFromCatalog(part)}
                    style={{
                      textAlign: 'left',
                      justifyContent: 'flex-start',
                      fontSize: 13,
                      padding: '10px 12px',
                      border: '1px solid var(--border-2)',
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{part.name}</span>
                    {part.part_number?.trim() ? (
                      <span style={{ fontWeight: 400, color: 'var(--text-3)', marginLeft: 6, fontSize: 12 }}>
                        ({part.part_number.trim()})
                      </span>
                    ) : null}
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, fontWeight: 400 }}>
                      Cost:{' '}
                      {part.default_unit_cost != null
                        ? `$${Number(part.default_unit_cost).toFixed(2)}`
                        : '—'}
                      {part.default_unit_price != null ? (
                        <> · List: ${Number(part.default_unit_price).toFixed(2)}</>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setCatalogPickerOpen(false)}
                style={{ fontSize: 12 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
