'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { InvoiceListRow } from './page'

// ─────────────────────────────────────────────────────────────────────────────
// Badge styles
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: '#e2e8f0', color: '#1e293b', label: 'Draft' },
  sent:  { bg: '#dbeafe', color: '#1e40af', label: 'Sent' },
  paid:  { bg: '#dcfce7', color: '#14532d', label: 'Paid in Full' },
  void:  { bg: '#fee2e2', color: '#7f1d1d', label: 'Void' },
}

const PAYMENT_STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  unpaid:          { bg: '#fee2e2', color: '#991b1b', label: 'Payment Due' },
  partially_paid:  { bg: '#fef3c7', color: '#92400e', label: 'Partial' },
  paid:            { bg: '#dcfce7', color: '#14532d', label: 'Paid in Full' },
}

function statusStyle(status: string) {
  return STATUS_STYLES[status] ?? { bg: '#f1f5f9', color: '#475569', label: status }
}
function paymentStatusStyle(ps: string) {
  return PAYMENT_STATUS_STYLES[ps] ?? { bg: '#f1f5f9', color: '#475569', label: ps }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  invoices: InvoiceListRow[]
}

export default function InvoicesList({ invoices }: Props) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // ── Filter logic ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = invoices

    if (statusFilter !== 'all') {
      result = result.filter(inv => inv.status === statusFilter)
    }

    const q = query.trim().toLowerCase()
    if (q) {
      result = result.filter(inv =>
        (inv.invoice_number ?? '').toLowerCase().includes(q) ||
        (inv.customerName ?? '').toLowerCase().includes(q) ||
        (inv.vehicleLabel ?? '').toLowerCase().includes(q),
      )
    }

    return result
  }, [invoices, query, statusFilter])

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="dash-content">

      {/* ── Toolbar: search + status filter ─────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center',
        marginBottom: 16, flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 400 }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by invoice #, customer, or vehicle…"
            className="field-input"
            style={{
              width: '100%',
              fontSize: 13, padding: '8px 10px',
            }}
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="field-input"
          style={{
            fontSize: 13, padding: '8px 10px', flex: '0 0 auto',
          }}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="void">Void</option>
        </select>
      </div>

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{
          padding: '24px', textAlign: 'center', color: 'var(--text-3)',
        }}>
          <p style={{ fontSize: 14, margin: 0 }}>No invoices found</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Created</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Paid</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
                <th style={{ textAlign: 'center' }}>Payment</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((invoice) => {
                const status  = statusStyle(invoice.status)
                const isVoid  = invoice.status === 'void'
                const payment = isVoid
                  ? { bg: '#f1f5f9', color: '#64748b', label: '—' }
                  : paymentStatusStyle(invoice.payment_status ?? 'unpaid')
                const date = new Date(invoice.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })
                const paid = Number(invoice.amount_paid ?? 0)
                const bal  = Number(invoice.balance_due ?? 0)

                return (
                  <tr key={invoice.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>
                      {invoice.invoice_number || invoice.id}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text)' }}>
                      {date}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text)' }}>
                      {invoice.customerName || '—'}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text)' }}>
                      {invoice.vehicleLabel || '—'}
                    </td>
                    <td style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--text)',
                      textAlign: 'right', fontFamily: 'var(--font-mono)',
                    }}>
                      ${(invoice.total ?? 0).toFixed(2)}
                    </td>
                    <td style={{
                      textAlign: 'right',
                      fontSize: 13, fontFamily: 'var(--font-mono)',
                      color: isVoid ? 'var(--text-3)' : paid > 0 ? '#15803d' : 'var(--text-3)',
                    }}>
                      {isVoid ? '—' : paid > 0 ? `$${paid.toFixed(2)}` : '—'}
                    </td>
                    <td style={{
                      textAlign: 'right',
                      fontSize: 13, fontFamily: 'var(--font-mono)',
                      color: isVoid ? 'var(--text-3)' : bal > 0 ? '#dc2626' : '#15803d',
                      fontWeight: 600,
                    }}>
                      {isVoid ? '—' : bal > 0 ? `$${bal.toFixed(2)}` : '$0.00'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{
                        display: 'inline-block',
                        background: payment.bg, color: payment.color,
                        padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      }}>
                        {payment.label}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{
                        display: 'inline-block',
                        background: status.bg, color: status.color,
                        padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      }}>
                        {status.label}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link
                          href={`/dashboard/invoices/${invoice.id}`}
                          className="btn-ghost"
                          style={{
                            padding: '4px 10px',
                            fontSize: 12, fontWeight: 600,
                          }}
                        >
                          View
                        </Link>
                        <a
                          href={`/invoices/${invoice.id}/print`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ghost"
                          style={{
                            padding: '4px 10px',
                            fontSize: 12, fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          Print
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Summary ────────────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 16, fontSize: 12, color: 'var(--text-3)',
      }}>
        Showing {filtered.length} of {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
