'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { InvoiceWithItems, InvoicePayment, PaymentMethod, CardType } from '@/lib/types'
import { recordInvoicePayment } from '../actions'

// ─────────────────────────────────────────────────────────────────────────────
// Badge helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: '#e2e8f0', color: '#1e293b', label: 'Draft' },
  sent:  { bg: '#dbeafe', color: '#1e40af', label: 'Sent' },
  paid:  { bg: '#dcfce7', color: '#14532d', label: 'Paid in Full' },
  void:  { bg: '#fee2e2', color: '#7f1d1d', label: 'Void' },
}
const PAYMENT_STATUS_STYLES: Record<string, { bg: string; color: string; label: string; border: string }> = {
  unpaid:         { bg: '#fff1f2', color: '#991b1b', label: 'Payment Due', border: '#fecaca' },
  partially_paid: { bg: '#fffbeb', color: '#92400e', label: 'Partially Paid', border: '#fde68a' },
  paid:           { bg: '#f0fdf4', color: '#14532d', label: 'Paid in Full', border: '#bbf7d0' },
}
const METHOD_LABELS: Record<string, string> = {
  card:      '💳 Card',
  cash:      '💵 Cash',
  zelle:     '📲 Zelle',
  check:     '📝 Check',
  financing: '🏦 Financing',
  other:     'Other',
}
const CARD_TYPE_LABELS: Record<string, string> = {
  debit:      'Debit',
  visa:       'Visa',
  mastercard: 'Mastercard',
  amex:       'Amex',
  other:      'Other',
}

function statusStyle(s: string) {
  return STATUS_STYLES[s] ?? { bg: '#f1f5f9', color: '#475569', label: s }
}
function paymentStatusStyle(ps: string) {
  return PAYMENT_STATUS_STYLES[ps] ?? { bg: '#f1f5f9', color: '#475569', label: ps, border: '#e2e8f0' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-method validation rules
// ─────────────────────────────────────────────────────────────────────────────

function referenceLabel(method: PaymentMethod): string | null {
  switch (method) {
    case 'zelle':     return 'Confirmation Number'
    case 'check':     return 'Check Number'
    case 'financing': return 'Approval / Contract Number'
    case 'other':     return 'Reference Number'
    default:          return null
  }
}

function validatePaymentForm(
  method: PaymentMethod,
  cardType: CardType | '',
  last4: string,
  authNum: string,
  refNum: string,
): string | null {
  if (method === 'card') {
    if (!cardType)   return 'Please select a card type.'
    if (!last4.trim()) return 'Please enter the last 4 digits.'
    if (!/^\d{4}$/.test(last4.trim())) return 'Last 4 digits must be exactly 4 numbers.'
    if (!authNum.trim()) return 'Please enter the authorization number.'
  }
  if (['zelle', 'check', 'financing', 'other'].includes(method)) {
    if (!refNum.trim()) return `Please enter the ${referenceLabel(method) ?? 'reference'}.`
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment history detail line
// ─────────────────────────────────────────────────────────────────────────────

function paymentMeta(p: InvoicePayment): string | null {
  if (p.payment_method === 'card') {
    const parts: string[] = []
    if (p.card_type)            parts.push(CARD_TYPE_LABELS[p.card_type] ?? p.card_type)
    if (p.last4_digits)         parts.push(`····${p.last4_digits}`)
    if (p.authorization_number) parts.push(`Auth: ${p.authorization_number}`)
    return parts.length ? parts.join(' · ') : null
  }
  if (p.reference_number) {
    const label = referenceLabel(p.payment_method as PaymentMethod)
    return label ? `${label}: ${p.reference_number}` : p.reference_number
  }
  return p.note ?? null
}

// ─────────────────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 16)
}

const CARD_TYPES: CardType[] = ['debit', 'visa', 'mastercard', 'amex', 'other']
const PAYMENT_METHODS: PaymentMethod[] = ['card', 'cash', 'zelle', 'check', 'financing', 'other']

export type InvoiceShopHeader = {
  businessName: string
  addressLines: string[]
  phone:        string | null
  email:        string | null
  logoUrl:      string | null
}

interface InvoiceDetailProps {
  invoice:        InvoiceWithItems
  shopHeader:     InvoiceShopHeader
  customerName:   string | null
  vehicleDisplay: string | null
  payments:       InvoicePayment[]
  canRecordPayment?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────

export default function InvoiceDetail({
  invoice,
  shopHeader,
  customerName,
  vehicleDisplay,
  payments,
  canRecordPayment = true,
}: InvoiceDetailProps) {
  const router        = useRouter()
  const status        = statusStyle(invoice.status)
  const paymentStatus = paymentStatusStyle(invoice.payment_status ?? 'unpaid')
  const amountPaid    = Number(invoice.amount_paid ?? 0)
  const total         = Number(invoice.total ?? 0)
  // Outstanding balance from totals − payments (avoids stale balance_due === 0 on unpaid rows).
  const outstandingBalance = Math.max(0, Math.round((total - amountPaid) * 100) / 100)
  const isFullyPaid   = (invoice.payment_status ?? 'unpaid') === 'paid'
  const isVoid        = invoice.status === 'void'

  // ── Form state ────────────────────────────────────────────────────────────
  const [showForm, setShowForm]   = useState(false)
  const [amount, setAmount]       = useState(outstandingBalance > 0 ? outstandingBalance.toFixed(2) : '')
  const [method, setMethod]       = useState<PaymentMethod>('cash')
  const [paidAt, setPaidAt]       = useState(todayISO())
  const [note, setNote]           = useState('')
  // card-specific
  const [cardType, setCardType]   = useState<CardType | ''>('')
  const [last4, setLast4]         = useState('')
  const [authNum, setAuthNum]     = useState('')
  // reference-based (zelle, check, financing, other)
  const [refNum, setRefNum]       = useState('')

  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function resetMethodFields() {
    setCardType('')
    setLast4('')
    setAuthNum('')
    setRefNum('')
  }

  function handleMethodChange(m: PaymentMethod) {
    setMethod(m)
    resetMethodFields()
    setSaveError(null)
  }

  const handlePrint = () => window.open(`/invoices/${invoice.id}/print`, '_blank')

  async function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!canRecordPayment) return
    setSaveError(null)

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setSaveError('Please enter a valid amount.')
      return
    }

    const methodError = validatePaymentForm(method, cardType, last4, authNum, refNum)
    if (methodError) { setSaveError(methodError); return }

    setSaving(true)
    try {
      const err = await recordInvoicePayment(invoice.id, {
        amount:               parsedAmount,
        payment_method:       method,
        paid_at:              new Date(paidAt).toISOString(),
        note:                 note.trim() || null,
        card_type:            method === 'card' ? (cardType as CardType) : null,
        last4_digits:         method === 'card' ? last4.trim() : null,
        authorization_number: method === 'card' ? authNum.trim() : null,
        reference_number:     ['zelle', 'check', 'financing', 'other'].includes(method)
                                ? refNum.trim()
                                : null,
      })
      if (err) {
        setSaveError(err.error)
      } else {
        setShowForm(false)
        resetMethodFields()
        setNote('')
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  const refLabel = referenceLabel(method)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* ── Shop header ────────────────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          marginBottom: 16,
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
        {shopHeader.logoUrl && (
          <img
            src={shopHeader.logoUrl}
            alt=""
            style={{ maxHeight: 52, maxWidth: 160, objectFit: 'contain' }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            {shopHeader.businessName}
          </div>
          {shopHeader.addressLines.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.45 }}>
              {shopHeader.addressLines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
          {(shopHeader.phone || shopHeader.email) && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.5 }}>
              {shopHeader.phone && <div>Phone: {shopHeader.phone}</div>}
              {shopHeader.email && <div>Email: {shopHeader.email}</div>}
            </div>
          )}
        </div>
      </div>

      {/* ── Payment status banner ──────────────────────────────────────────── */}
      {isVoid ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', marginBottom: 16,
          borderRadius: 8, border: '1px solid #e2e8f0',
          background: '#f8fafc',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
            This invoice is void. It is not collectible and payments cannot be recorded.
          </span>
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', marginBottom: 16,
          borderRadius: 8, border: `1px solid ${paymentStatus.border}`,
          background: paymentStatus.bg,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: paymentStatus.color }}>
              {paymentStatus.label}
            </span>
            {amountPaid > 0 && (
              <span style={{ fontSize: 12, color: paymentStatus.color, opacity: 0.85 }}>
                ${amountPaid.toFixed(2)} received
                {outstandingBalance > 0 ? ` · $${outstandingBalance.toFixed(2)} remaining` : ''}
              </span>
            )}
            {amountPaid === 0 && outstandingBalance > 0 && (
              <span style={{ fontSize: 12, color: paymentStatus.color, opacity: 0.85 }}>
                Balance due: ${outstandingBalance.toFixed(2)}
              </span>
            )}
          </div>
          {!isFullyPaid && canRecordPayment && outstandingBalance > 0 && (
            <button
              type="button"
              onClick={() => setShowForm(v => !v)}
              style={{
                padding: '6px 14px', borderRadius: 6,
                fontSize: 12, fontWeight: 600,
                border: `1px solid ${paymentStatus.border}`,
                background: 'white', color: paymentStatus.color, cursor: 'pointer',
              }}
            >
              {showForm ? 'Cancel' : 'Add Payment'}
            </button>
          )}
        </div>
      )}

      {/* ── Add Payment form ────────────────────────────────────────────── */}
      {showForm && !isFullyPaid && !isVoid && canRecordPayment && outstandingBalance > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
            Add Payment
          </div>
          <form onSubmit={handleSubmitPayment}>

            {/* Row 1: Amount + Method + Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Amount</label>
                <input
                  type="number" step="0.01" min="0.01" max={outstandingBalance}
                  value={amount} onChange={e => setAmount(e.target.value)}
                  required className="field-input"
                  style={{ width: '100%', fontSize: 13 }} placeholder="0.00"
                />
                {outstandingBalance > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                    Outstanding balance: ${outstandingBalance.toFixed(2)}
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Payment Method</label>
                <select
                  value={method}
                  onChange={e => handleMethodChange(e.target.value as PaymentMethod)}
                  className="field-input" style={{ width: '100%', fontSize: 13 }}
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m} value={m}>{METHOD_LABELS[m]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Payment date</label>
                <input
                  type="datetime-local" value={paidAt}
                  onChange={e => setPaidAt(e.target.value)}
                  required className="field-input" style={{ width: '100%', fontSize: 13 }}
                  title="Date and time the payment was received"
                />
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                  Use the date the customer paid (you can adjust time if needed).
                </div>
              </div>
            </div>

            {/* Card-specific fields */}
            {method === 'card' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Card Type <Required /></label>
                  <select
                    value={cardType}
                    onChange={e => setCardType(e.target.value as CardType)}
                    className="field-input" style={{ width: '100%', fontSize: 13 }}
                  >
                    <option value="">Select type…</option>
                    {CARD_TYPES.map(t => (
                      <option key={t} value={t}>{CARD_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Last 4 Digits <Required /></label>
                  <input
                    type="text" maxLength={4} value={last4}
                    onChange={e => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="field-input" style={{ width: '100%', fontSize: 13 }}
                    placeholder="1234"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Authorization Number <Required /></label>
                  <input
                    type="text" value={authNum}
                    onChange={e => setAuthNum(e.target.value)}
                    className="field-input" style={{ width: '100%', fontSize: 13 }}
                    placeholder="Auth code"
                  />
                </div>
              </div>
            )}

            {/* Reference field for zelle / check / financing / other */}
            {refLabel && (
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{refLabel} <Required /></label>
                <input
                  type="text" value={refNum}
                  onChange={e => setRefNum(e.target.value)}
                  className="field-input" style={{ width: '100%', fontSize: 13 }}
                  placeholder={refLabel}
                />
              </div>
            )}

            {/* Optional note — always available */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Internal Note (optional)</label>
              <input
                type="text" value={note}
                onChange={e => setNote(e.target.value)}
                className="field-input" style={{ width: '100%', fontSize: 13 }}
                placeholder="Any additional notes…"
              />
            </div>

            {saveError && (
              <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 10 }}>{saveError}</div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit" disabled={saving}
                style={{
                  padding: '8px 18px', borderRadius: 6,
                  fontSize: 13, fontWeight: 600,
                  background: saving ? '#94a3b8' : '#16a34a',
                  color: 'white', border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving…' : 'Save Payment'}
              </button>
              <button
                type="button" onClick={() => { setShowForm(false); resetMethodFields() }}
                style={{
                  padding: '8px 14px', borderRadius: 6,
                  fontSize: 13, fontWeight: 600,
                  background: 'var(--bg-2)', color: 'var(--text)',
                  border: '1px solid var(--border-2)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Invoice header card ────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>
              Invoice #{invoice.invoice_number || invoice.id}
            </div>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', marginBottom: 8 }}>
              Created {new Date(invoice.created_at).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handlePrint}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: '1px solid var(--border-2)', background: 'var(--bg-2)',
                color: 'var(--text)', cursor: 'pointer',
              }}
            >
              Print
            </button>
            <div style={{
              background: status.bg,
              color: status.color,
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
            }}
            >
              {status.label}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 20 }}>
          <div>
            <div style={sectionLabel}>Bill To</div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>{customerName || '—'}</div>
          </div>
          <div>
            <div style={sectionLabel}>Vehicle</div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>{vehicleDisplay || '—'}</div>
          </div>
        </div>

        {invoice.work_order_id && (
          <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-2)' }}>
            <div style={sectionLabel}>Source Work Order</div>
            <Link
              href={`/dashboard/work-orders/${invoice.work_order_id}`}
              style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}
            >
              WO-{invoice.work_order_id.substring(0, 8)}… →
            </Link>
          </div>
        )}
      </div>

      {/* ── Line items ────────────────────────────────────────────────────── */}
      {invoice.items.length > 0 ? (
        <div className="table-wrap" style={{ marginBottom: 24 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ textAlign: 'right' }}>Labor</th>
                <th style={{ textAlign: 'right' }}>Parts</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                    {item.title}
                    {item.description && (
                      <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-2)', marginTop: 4 }}>
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                    {item.labor_total > 0 ? `$${item.labor_total.toFixed(2)}` : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                    {item.parts_total > 0 ? `$${item.parts_total.toFixed(2)}` : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    ${item.line_total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state" style={{ marginBottom: 24 }}>
          <div className="empty-state-icon">—</div>
          <div className="empty-state-title">No line items</div>
        </div>
      )}

      {/* ── Totals card ───────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 24 }}>
          <div />
          <div>
            <Row label="Labor"  value={`$${invoice.subtotal_labor.toFixed(2)}`} />
            <Row label="Parts"  value={`$${invoice.subtotal_parts.toFixed(2)}`} />
            <div style={{ borderTop: '1px solid var(--border-2)', paddingTop: 8, marginBottom: 8 }}>
              <Row label="Subtotal" value={`$${invoice.subtotal.toFixed(2)}`} bold />
            </div>
            {invoice.tax_rate && invoice.tax_rate > 0 && (
              <Row
                label={`Tax on parts (${(invoice.tax_rate * 100).toFixed(2)}%)`}
                value={`$${invoice.tax_amount.toFixed(2)}`}
              />
            )}
            <div style={{ borderTop: '1px solid var(--border-2)', paddingTop: 8, marginTop: 8 }}>
              <Row label="Total" value={`$${invoice.total.toFixed(2)}`} bold large />
            </div>
            {amountPaid > 0 && (
              <Row label="Paid" value={`−$${amountPaid.toFixed(2)}`} green />
            )}
            {outstandingBalance > 0 && (
              <div style={{ borderTop: '1px solid var(--border-2)', paddingTop: 6, marginTop: 4 }}>
                <Row label="Balance Due" value={`$${outstandingBalance.toFixed(2)}`} bold red />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Payment history ───────────────────────────────────────────────── */}
      {payments.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={sectionLabel}>Payment History</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {payments.map((p, idx) => {
              const meta = paymentMeta(p)
              return (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  padding: '10px 0',
                  borderBottom: idx < payments.length - 1 ? '1px solid var(--border-2)' : 'none',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                        {new Date(p.paid_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        background: '#f1f5f9', color: '#475569',
                        padding: '2px 7px', borderRadius: 4,
                      }}>
                        {METHOD_LABELS[p.payment_method] ?? p.payment_method}
                      </span>
                    </div>
                    {meta && (
                      <span style={{ fontSize: 11, color: 'var(--text-3)', paddingLeft: 2 }}>
                        {meta}
                      </span>
                    )}
                    {p.note && (
                      <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', paddingLeft: 2 }}>
                        {p.note}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    fontFamily: 'var(--font-mono)', color: '#15803d',
                  }}>
                    +${Number(p.amount).toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Notes ─────────────────────────────────────────────────────────── */}
      {invoice.notes && (
        <div className="card">
          <div style={sectionLabel}>Notes</div>
          <div style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
            {invoice.notes}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Small shared style helpers
// ─────────────────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
  textTransform: 'uppercase', letterSpacing: '0.04em',
  display: 'block', marginBottom: 4,
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.04em', color: 'var(--text-3)', marginBottom: 8,
}

function Required() {
  return <span style={{ color: '#dc2626' }}> *</span>
}

function Row({
  label, value, bold, large, green, red,
}: {
  label: string
  value: string
  bold?:  boolean
  large?: boolean
  green?: boolean
  red?:   boolean
}) {
  const fs    = large ? 13 : 12
  const color = green ? '#15803d' : red ? '#dc2626' : undefined
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ fontSize: fs, fontWeight: bold ? 700 : 400, color: color ?? 'var(--text-2)' }}>
        {label}
      </span>
      <span style={{ fontSize: fs, fontWeight: bold ? 700 : 400, fontFamily: 'var(--font-mono)', color }}>
        {value}
      </span>
    </div>
  )
}
