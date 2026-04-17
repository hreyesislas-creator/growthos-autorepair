'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { PartsCatalog } from '@/lib/types'
import { createPart, updatePart, deletePart } from './actions'

export default function PartsCatalogForm({ initial }: { initial: PartsCatalog | null }) {
  const router = useRouter()
  const isNew = initial == null

  const [partNumber, setPartNumber] = useState(initial?.part_number ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [unitCost, setUnitCost] = useState(
    initial?.default_unit_cost != null ? String(initial.default_unit_cost) : '',
  )
  const [unitPrice, setUnitPrice] = useState(
    initial?.default_unit_price != null ? String(initial.default_unit_price) : '',
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const costParsed = unitCost.trim() === '' ? null : parseFloat(unitCost)
    const priceParsed = unitPrice.trim() === '' ? null : parseFloat(unitPrice)

    if (costParsed != null && (!Number.isFinite(costParsed) || costParsed < 0)) {
      setError('Default unit cost must be a valid number (0 or greater).')
      setBusy(false)
      return
    }
    if (priceParsed != null && (!Number.isFinite(priceParsed) || priceParsed < 0)) {
      setError('Default unit price must be a valid number (0 or greater).')
      setBusy(false)
      return
    }

    if (isNew) {
      const r = await createPart({
        part_number: partNumber || null,
        name,
        description: description || null,
        default_unit_cost: costParsed,
        default_unit_price: priceParsed,
      })
      setBusy(false)
      if ('error' in r) {
        setError(r.error)
        return
      }
      router.push('/dashboard/parts')
      router.refresh()
      return
    }

    const err = await updatePart(initial.id, {
      part_number: partNumber || null,
      name,
      description: description || null,
      default_unit_cost: costParsed,
      default_unit_price: priceParsed,
    })
    setBusy(false)
    if (err) {
      setError(err.error)
      return
    }
    router.push('/dashboard/parts')
    router.refresh()
  }

  async function handleDeactivate() {
    if (!initial || !confirm('Remove this part from the catalog? It will no longer appear in pickers.')) {
      return
    }
    setBusy(true)
    setError(null)
    const err = await deletePart(initial.id)
    setBusy(false)
    if (err) {
      setError(err.error)
      return
    }
    router.push('/dashboard/parts')
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

      <label className="field-label" style={{ display: 'block', marginBottom: 4 }}>Part number</label>
      <input
        className="field-input"
        value={partNumber}
        onChange={e => setPartNumber(e.target.value)}
        placeholder="SKU or manufacturer number (optional)"
        style={{ width: '100%', marginBottom: 14 }}
      />

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
        rows={3}
        placeholder="Optional notes for staff"
        style={{ width: '100%', marginBottom: 14, resize: 'vertical' }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div>
          <label className="field-label" style={{ display: 'block', marginBottom: 4 }}>Default unit cost</label>
          <input
            className="field-input"
            type="number"
            step="0.01"
            min="0"
            value={unitCost}
            onChange={e => setUnitCost(e.target.value)}
            placeholder="Your cost basis"
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label className="field-label" style={{ display: 'block', marginBottom: 4 }}>Default unit price</label>
          <input
            className="field-input"
            type="number"
            step="0.01"
            min="0"
            value={unitPrice}
            onChange={e => setUnitPrice(e.target.value)}
            placeholder="Typical sell price"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 16px', lineHeight: 1.45 }}>
        This catalog is for consistent pricing only. Stock levels and purchasing are not tracked here.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : isNew ? 'Add part' : 'Save changes'}
        </button>
        <Link href="/dashboard/parts" className="btn-ghost">
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
            Remove from catalog
          </button>
        )}
      </div>
    </form>
  )
}
