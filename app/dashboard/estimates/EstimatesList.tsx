'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { EstimateListRow } from './page'

// ─────────────────────────────────────────────────────────────────────────────
// Display status styles
//
// Keys are the `displayStatus` values derived by deriveDisplayStatus() in
// page.tsx — NOT raw DB status values.
//
// The status filter dropdown (and its filter logic) still uses the raw DB
// `status` field so existing filter behaviour is unchanged.
// ─────────────────────────────────────────────────────────────────────────────

const DISPLAY_STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  'Pending':             { bg: '#e2e8f0', color: '#1e293b' },
  'Presented':           { bg: '#dbeafe', color: '#1e40af' },
  'Customer Responding': { bg: '#fef9c3', color: '#854d0e' },
  'Partially Approved':  { bg: '#fed7aa', color: '#7c2d12' },
  'Approved':            { bg: '#dcfce7', color: '#14532d' },
  'Declined':            { bg: '#fee2e2', color: '#991b1b' },
}

function displayStatusStyle(displayStatus: string): { bg: string; color: string } {
  return DISPLAY_STATUS_STYLES[displayStatus] ?? { bg: '#f1f5f9', color: '#475569' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Creation mode badge — only shown for non-manual estimates
// ─────────────────────────────────────────────────────────────────────────────

const CREATION_MODE_LABELS: Record<string, string> = {
  system_generated: 'From Inspection',
  pdf_import:       'PDF Import',
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  estimates: EstimateListRow[]
}

export default function EstimatesList({ estimates }: Props) {
  const [query,        setQuery]        = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // ── Filter logic ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = estimates

    if (statusFilter !== 'all') {
      result = result.filter(e => e.status === statusFilter)
    }

    const q = query.trim().toLowerCase()
    if (q) {
      result = result.filter(e =>
        e.estimate_number.toLowerCase().includes(q) ||
        (e.customerName  ?? '').toLowerCase().includes(q) ||
        (e.vehicleLabel  ?? '').toLowerCase().includes(q),
      )
    }

    return result
  }, [estimates, query, statusFilter])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="dash-content">

      {/* ── Toolbar: search + status filter ─────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center',
        marginBottom: 16, flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 400 }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 14, color: 'var(--text-3)', pointerEvents: 'none',
          }}>🔍</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by estimate #, customer, or vehicle…"
            className="field-input"
            style={{
              width: '100%', paddingLeft: 32, paddingRight: 10,
              fontSize: 13, padding: '8px 10px 8px 32px',
            }}
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="field-input"
          style={{ fontSize: 13, padding: '8px 10px', flexShrink: 0 }}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Pending</option>
          <option value="sent">Presented</option>
          <option value="approved">Approved</option>
          <option value="declined">Rejected</option>
        </select>

        {/* Count */}
        <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>
          {filtered.length} of {estimates.length} estimate{estimates.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table / empty state ───────────────────────────────────────────── */}
      <div className="table-wrap">
        {estimates.length === 0 ? (

          /* No estimates at all */
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No estimates yet</div>
            <div className="empty-state-body">
              Open an inspection and click <strong>Create Estimate</strong> to get started.
            </div>
          </div>

        ) : filtered.length === 0 ? (

          /* Estimates exist but search/filter returned nothing */
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-title">No matching estimates</div>
            <div className="empty-state-body">
              Try a different search term or clear the status filter.
            </div>
          </div>

        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ whiteSpace: 'nowrap' }}>Estimate #</th>
                <th>Status</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ whiteSpace: 'nowrap' }}>Last Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(est => {
                const s = displayStatusStyle(est.displayStatus)
                const modeLabel = CREATION_MODE_LABELS[est.creation_mode]

                const updatedLabel = new Date(est.updated_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })

                return (
                  <tr key={est.id}>

                    {/* Estimate # + optional source badge */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 13,
                          fontWeight: 700, color: 'var(--text)',
                        }}>
                          {est.estimate_number}
                        </span>
                        {modeLabel && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '1px 6px',
                            borderRadius: 4, background: '#f1f5f9',
                            color: '#475569', whiteSpace: 'nowrap',
                          }}>
                            {modeLabel}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status badge — derived display label, high-contrast */}
                    <td>
                      <span style={{
                        display: 'inline-block',
                        fontSize: 11, fontWeight: 700,
                        padding: '3px 10px', borderRadius: 999,
                        background: s.bg, color: s.color,
                        whiteSpace: 'nowrap',
                      }}>
                        {est.displayStatus}
                      </span>
                    </td>

                    {/* Customer */}
                    <td style={{ fontSize: 13, color: 'var(--text)' }}>
                      {est.customerName ?? <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>

                    {/* Vehicle */}
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>
                      {est.vehicleLabel ?? <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>

                    {/* Total */}
                    <td style={{
                      fontFamily: 'var(--font-mono)', fontSize: 13,
                      fontWeight: 700, color: 'var(--text)', textAlign: 'right',
                      whiteSpace: 'nowrap',
                    }}>
                      ${est.total.toFixed(2)}
                    </td>

                    {/* Last updated */}
                    <td style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                      {updatedLabel}
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <Link
                          href={`/dashboard/estimates/${est.id}`}
                          className="btn-ghost"
                          style={{ padding: '3px 10px', fontSize: '12px', whiteSpace: 'nowrap' }}
                        >
                          View
                        </Link>
                        <Link
                          href={`/dashboard/estimates/${est.id}/present`}
                          className="btn-ghost"
                          style={{ padding: '3px 10px', fontSize: '12px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}
                          title="Open customer presentation view"
                        >
                          Present ↗
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
