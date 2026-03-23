'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { savePricingConfig } from './actions'
import type { TenantPricingConfig } from '@/lib/types'

interface Props {
  config: TenantPricingConfig | null
}

export default function PricingConfigForm({ config }: Props) {
  const router = useRouter()

  // ── Tax Rate — display as percentage; DB stores fraction (0.0875 → "8.75") ──
  const initialTaxPct = config?.default_tax_rate != null
    ? String(parseFloat((Number(config.default_tax_rate) * 100).toFixed(4)))
    : ''

  // ── Labor Rate — stored as $/hr, displayed as-is ───────────────────────────
  const initialLaborRate = config?.default_labor_rate != null
    ? String(Number(config.default_labor_rate))
    : ''

  // ── Parts Markup — stored as percentage (e.g. 30.00 = 30%) ───────────────
  const initialMarkupPct = config?.parts_markup_percent != null
    ? String(Number(config.parts_markup_percent))
    : ''

  const [taxRatePct,     setTaxRatePct]     = useState(initialTaxPct)
  const [laborRate,      setLaborRate]      = useState(initialLaborRate)
  const [partsMarkupPct, setPartsMarkupPct] = useState(initialMarkupPct)
  const [pending,        setPending]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [savedAt,        setSavedAt]        = useState<Date | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    setSavedAt(null)

    const result = await savePricingConfig({
      default_tax_rate_pct:   taxRatePct,
      default_labor_rate_str: laborRate,
      parts_markup_pct_str:   partsMarkupPct,
    })

    if ('error' in result) {
      setError(result.error)
      setPending(false)
      return
    }

    setSavedAt(new Date())
    setPending(false)
    router.refresh()
  }

  // Live previews
  const taxPreview = taxRatePct.trim()
    ? (parseFloat(taxRatePct) / 100 * 100).toFixed(2)
    : null

  const laborRateNum   = parseFloat(laborRate)  || 0
  const markupPctNum   = parseFloat(partsMarkupPct) || 0
  const partSellPreview = markupPctNum > 0
    ? (10 * (1 + markupPctNum / 100)).toFixed(2)
    : null

  return (
    <form onSubmit={handleSubmit}>

      {/* ── Tax Rate ─────────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: 4 }}>
          Default Tax Rate
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.5 }}>
          Applied automatically to every new estimate. You can still override the rate
          per-estimate in the estimate editor.
          <strong style={{ color: '#b45309' }}> Tax applies to parts only — labor is never taxed.</strong>
        </p>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 160 }}>
            <label className="field-label">
              Tax Rate
              <span style={{ fontWeight: 400, color: 'var(--text-3)', marginLeft: 4 }}>(%)</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number"
                min="0"
                max="100"
                step="0.001"
                placeholder="e.g. 8.75"
                value={taxRatePct}
                onChange={e => { setTaxRatePct(e.target.value); setSavedAt(null); setError(null) }}
                className="field-input"
                style={{ width: 110 }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>%</span>
            </div>
          </div>

          {taxPreview !== null && (
            <div style={{
              padding: '8px 12px', borderRadius: 'var(--r8,8px)',
              background: 'var(--surface-2,#f8fafc)',
              border: '1px solid var(--border)',
              fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6,
            }}>
              <span>On $100 parts:</span>
              <br />
              <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>
                Tax = ${taxPreview}
              </span>
              <span style={{ marginLeft: 6 }}>
                → Total ${(100 + parseFloat(taxPreview)).toFixed(2)}
              </span>
            </div>
          )}

          {taxRatePct.trim() === '' && (
            <div style={{
              padding: '8px 12px', borderRadius: 'var(--r8,8px)',
              background: '#fffbeb', border: '1px solid #fde68a',
              fontSize: 12, color: '#92400e',
            }}>
              No default rate — estimates will start with no tax pre-filled.
            </div>
          )}
        </div>
      </div>

      {/* ── Labor & Parts ─────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="section-title" style={{ marginBottom: 4 }}>
          Labor &amp; Parts
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.5 }}>
          Set your shop&apos;s default labor rate and parts markup. These auto-populate
          new estimate line items so advisors don&apos;t have to re-enter them every time.
        </p>

        <div className="form-grid">

          {/* Default Labor Rate */}
          <div className="form-group">
            <label className="field-label">
              Default Labor Rate
              <span style={{ fontWeight: 400, color: 'var(--text-3)', marginLeft: 4 }}>($/hr)</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 125.00"
                value={laborRate}
                onChange={e => { setLaborRate(e.target.value); setSavedAt(null); setError(null) }}
                className="field-input"
                style={{ width: 120 }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>/hr</span>
            </div>
            {laborRateNum > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                1 hr job → ${laborRateNum.toFixed(2)} labor
              </div>
            )}
          </div>

          {/* Parts Markup % */}
          <div className="form-group">
            <label className="field-label">
              Parts Markup
              <span style={{ fontWeight: 400, color: 'var(--text-3)', marginLeft: 4 }}>(%)</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number"
                min="0"
                max="1000"
                step="0.1"
                placeholder="e.g. 30"
                value={partsMarkupPct}
                onChange={e => { setPartsMarkupPct(e.target.value); setSavedAt(null); setError(null) }}
                className="field-input"
                style={{ width: 110 }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>%</span>
            </div>
            {partSellPreview !== null && (
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                $10.00 cost → ${partSellPreview} sell
              </div>
            )}
          </div>

        </div>

        <div style={{
          marginTop: 8, padding: '8px 10px', borderRadius: 6,
          background: '#f0f9ff', border: '1px solid #bae6fd',
          fontSize: 11, color: '#0369a1',
        }}>
          <strong>Formula:</strong> sell price = cost × (1 + markup%). Markup is applied
          to all part costs on every estimate.
        </div>
      </div>

      {/* ── Feedback & Save ─────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          marginTop: 12, padding: '8px 12px', borderRadius: 'var(--r8,8px)',
          background: '#fff0f0', color: '#b91c1c', fontSize: 13,
        }}>
          {error}
        </div>
      )}
      {savedAt && !error && (
        <div style={{
          marginTop: 12, padding: '8px 12px', borderRadius: 'var(--r8,8px)',
          background: '#f0fdf4', color: '#15803d', fontSize: 13,
        }}>
          ✓ Saved at {savedAt.toLocaleTimeString()} — new estimates will use these defaults.
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          type="submit"
          className="btn-primary"
          disabled={pending}
          style={{ opacity: pending ? 0.6 : 1 }}
        >
          {pending ? 'Saving…' : 'Save Pricing Defaults'}
        </button>
        <a
          href="/dashboard/settings"
          className="btn-ghost"
          style={{ fontSize: 12 }}
        >
          ← Back to Settings
        </a>
      </div>
    </form>
  )
}
