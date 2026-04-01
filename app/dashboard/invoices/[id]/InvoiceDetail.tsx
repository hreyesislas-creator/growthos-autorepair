'use client'

import type { InvoiceWithItems } from '@/lib/types'
import Link from 'next/link'

interface InvoiceDetailProps {
  invoice: InvoiceWithItems
  customerName: string | null
  vehicleDisplay: string | null
}

// Status badge styles
const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: '#e2e8f0', color: '#1e293b', label: 'Draft' },
  sent: { bg: '#dbeafe', color: '#1e40af', label: 'Sent' },
  paid: { bg: '#dcfce7', color: '#14532d', label: 'Paid' },
  void: { bg: '#fee2e2', color: '#7f1d1d', label: 'Void' },
}

function statusStyle(status: string) {
  return STATUS_STYLES[status] ?? { bg: '#f1f5f9', color: '#475569', label: status }
}

export default function InvoiceDetail({ invoice, customerName, vehicleDisplay }: InvoiceDetailProps) {
  const status = statusStyle(invoice.status)

  const handlePrint = () => {
    window.open(`/invoices/${invoice.id}/print`, '_blank')
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>
              Invoice #{invoice.invoice_number || invoice.id}
            </div>
            <div style={{
              fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-3)',
              marginBottom: 8,
            }}>
              Created {new Date(invoice.created_at).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handlePrint}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid var(--border-2)',
                background: 'var(--bg-2)',
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              Print
            </button>
            <div style={{
              ...status,
              padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            }}>
              {status.label}
            </div>
          </div>
        </div>

        {/* Customer & Vehicle info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
              Bill To
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>
              {customerName || '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
              Vehicle
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>
              {vehicleDisplay || '—'}
            </div>
          </div>
        </div>

        {/* Work order reference */}
        {invoice.work_order_id && (
          <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-2)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
              Source Work Order
            </div>
            <Link
              href={`/dashboard/work-orders/${invoice.work_order_id}`}
              style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', cursor: 'pointer' }}
            >
              WO-{invoice.work_order_id.substring(0, 8)}… →
            </Link>
          </div>
        )}
      </div>

      {/* Line items table */}
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
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{item.title}</td>
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

      {/* Totals card with correct tax calculation breakdown */}
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 24 }}>
          <div></div>
          <div>
            {/* Labor subtotal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Labor</span>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                ${invoice.subtotal_labor.toFixed(2)}
              </span>
            </div>

            {/* Parts subtotal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Parts</span>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                ${invoice.subtotal_parts.toFixed(2)}
              </span>
            </div>

            {/* Subtotal before tax */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', marginBottom: 8, fontWeight: 600, borderTop: '1px solid var(--border-2)', paddingTop: 8 }}>
              <span style={{ fontSize: 12 }}>Subtotal</span>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                ${invoice.subtotal.toFixed(2)}
              </span>
            </div>

            {/* Tax (on parts only) */}
            {invoice.tax_rate && invoice.tax_rate > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  Tax on parts ({(invoice.tax_rate * 100).toFixed(2)}%)
                </span>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                  ${invoice.tax_amount.toFixed(2)}
                </span>
              </div>
            )}

            {/* Grand total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 700, borderTop: '1px solid var(--border-2)', marginTop: 8, paddingTop: 8 }}>
              <span style={{ fontSize: 13 }}>Total</span>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                ${invoice.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-3)', marginBottom: 8 }}>
            Notes
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
            {invoice.notes}
          </div>
        </div>
      )}
    </div>
  )
}
