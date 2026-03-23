'use client'

import { useState } from 'react'
import { approveEstimate, declineEstimate } from './actions'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Estimate {
  id:             string
  estimate_number: string
  status:         string
  notes:          string | null
  subtotal:       number
  tax_rate:       number | null
  tax_amount:     number
  total:          number
  created_at:     string
}

interface EstimateItem {
  id:           string
  title:        string
  description:  string | null
  notes:        string | null
  category:     string
  source_type:  string
  service_job_id: string | null
  labor_hours:  number | null
  labor_rate:   number | null
  labor_total:  number
  parts_total:  number
  line_total:   number
  display_order: number
}

interface Customer {
  first_name: string
  last_name:  string
  phone:      string | null
  email:      string | null
}

interface Vehicle {
  year:          number | null
  make:          string | null
  model:         string | null
  license_plate: string | null
}

interface Recommendation {
  id:               string
  title:            string
  description:      string | null
  technician_notes: string | null
  source_status:    string | null
  priority:         string | null
  item_name:        string | null
  section_name:     string | null
  estimated_price:  number | null
}

export interface Props {
  estimate:        Estimate
  items:           EstimateItem[]
  customer:        Customer | null
  vehicle:         Vehicle | null
  shopName:        string
  shopPhone:       string | null
  logoUrl:         string | null
  recommendations: Recommendation[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function isCritical(rec: Recommendation): boolean {
  return (
    rec.source_status === 'urgent' ||
    rec.priority === 'high' ||
    rec.priority === 'urgent'
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function CustomerPresentation({
  estimate,
  items,
  customer,
  vehicle,
  shopName,
  shopPhone,
  logoUrl,
  recommendations,
}: Props) {
  // Status is managed locally so approve/decline updates the UI instantly
  const [status, setStatus] = useState(estimate.status)
  const [busy,   setBusy]   = useState<'approve' | 'decline' | null>(null)
  const [error,  setError]  = useState<string | null>(null)

  const isDecided   = status === 'approved' || status === 'declined'
  const canDecide   = status === 'sent' || status === 'draft'

  async function handleApprove() {
    setBusy('approve')
    setError(null)
    const result = await approveEstimate(estimate.id)
    setBusy(null)
    if (result?.error) { setError(result.error); return }
    setStatus('approved')
  }

  async function handleDecline() {
    setBusy('decline')
    setError(null)
    const result = await declineEstimate(estimate.id)
    setBusy(null)
    if (result?.error) { setError(result.error); return }
    setStatus('declined')
  }

  // Sort findings: critical first, then warnings
  const sortedRecs = [...recommendations].sort((a, b) =>
    (isCritical(b) ? 1 : 0) - (isCritical(a) ? 1 : 0),
  )
  const criticalRecs = sortedRecs.filter(isCritical)
  const warningRecs  = sortedRecs.filter(r => !isCritical(r))

  const customerName = customer
    ? `${customer.first_name} ${customer.last_name}`.trim()
    : null

  const vehicleLabel = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')
    : null

  const taxRatePct = estimate.tax_rate != null
    ? (Number(estimate.tax_rate) * 100).toFixed(3).replace(/\.?0+$/, '')
    : null

  const formattedDate = new Date(estimate.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f4f8',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    }}>

      {/* ═══════════════════════════════════════════════════════════════════════
          SHOP HEADER
      ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#fff',
        padding: '28px 20px 24px',
        textAlign: 'center',
      }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={shopName}
            style={{
              height: 48, maxWidth: 200,
              objectFit: 'contain', marginBottom: 12,
            }}
          />
        ) : (
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(255,255,255,0.12)',
            fontSize: 22, marginBottom: 12,
          }}>
            🔧
          </div>
        )}

        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
          {shopName}
        </div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6, letterSpacing: '0.02em' }}>
          REPAIR ESTIMATE &nbsp;·&nbsp; {estimate.estimate_number}
        </div>

        {/* Status badge */}
        {(status === 'approved' || status === 'declined') && (
          <div style={{ marginTop: 12 }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 14px', borderRadius: 999,
              fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
              textTransform: 'uppercase',
              background: status === 'approved' ? '#16a34a' : '#dc2626',
              color: '#fff',
            }}>
              {status === 'approved' ? '✓ Approved' : '✕ Declined'}
            </span>
          </div>
        )}
      </div>

      {/* ── Page body ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 80px' }}>

        {/* ═══════════════════════════════════════════════════════════════════
            CUSTOMER / VEHICLE INFO CARD
        ═══════════════════════════════════════════════════════════════════ */}
        <div style={S.card}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {customerName && (
              <div style={{ flex: 1, minWidth: 130 }}>
                <div style={S.label}>Customer</div>
                <div style={S.value}>{customerName}</div>
                {customer?.phone && (
                  <div style={S.sub}>{customer.phone}</div>
                )}
              </div>
            )}
            {vehicleLabel && (
              <div style={{ flex: 1, minWidth: 130 }}>
                <div style={S.label}>Vehicle</div>
                <div style={S.value}>{vehicleLabel}</div>
                {vehicle?.license_plate && (
                  <div style={S.sub}>Plate: {vehicle.license_plate}</div>
                )}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 130 }}>
              <div style={S.label}>Date</div>
              <div style={S.value}>{formattedDate}</div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            INSPECTION FINDINGS
        ═══════════════════════════════════════════════════════════════════ */}
        {sortedRecs.length > 0 && (
          <section style={{ marginBottom: 8 }}>
            <div style={S.sectionHeader}>
              <span style={S.sectionIcon}>🔍</span>
              Inspection Findings
            </div>

            {/* Critical items — displayed with red urgent styling */}
            {criticalRecs.map(rec => (
              <FindingCard key={rec.id} rec={rec} isCritical={true} />
            ))}

            {/* Warning items */}
            {warningRecs.map(rec => (
              <FindingCard key={rec.id} rec={rec} isCritical={false} />
            ))}
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            REPAIR ESTIMATE
        ═══════════════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: 8 }}>
          <div style={S.sectionHeader}>
            <span style={S.sectionIcon}>📋</span>
            Repair Estimate
          </div>

          <div style={S.card}>
            {items.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: '12px 0', margin: 0 }}>
                No line items on this estimate.
              </p>
            ) : (
              <>
                {/* Line items */}
                <div>
                  {items.map((item, idx) => {
                    const isJobMode   = !!item.service_job_id
                    const laborHours  = Number(item.labor_hours  ?? 0)
                    const laborRate   = Number(item.labor_rate   ?? 0)
                    const laborTotal  = Number(item.labor_total  ?? 0)
                    const partsTotal  = Number(item.parts_total  ?? 0)
                    const lineTotal   = Number(item.line_total)
                    const isLast      = idx === items.length - 1

                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: '14px 0',
                          borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Title */}
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                              {item.title}
                            </div>

                            {/* Description */}
                            {item.description && (
                              <div style={{ fontSize: 13, color: '#64748b', marginTop: 3, lineHeight: 1.4 }}>
                                {item.description}
                              </div>
                            )}

                            {/* Job-based labor breakdown */}
                            {isJobMode && laborHours > 0 && (
                              <div style={{
                                marginTop: 6, fontSize: 12, color: '#94a3b8',
                                display: 'flex', flexWrap: 'wrap', gap: '0 8px',
                              }}>
                                <span>
                                  Labor: {laborHours}h &times; ${laborRate.toFixed(2)}/hr = ${laborTotal.toFixed(2)}
                                </span>
                                {partsTotal > 0 && (
                                  <span>Parts: ${partsTotal.toFixed(2)}</span>
                                )}
                              </div>
                            )}

                            {/* Line item note */}
                            {item.notes && (
                              <div style={{
                                marginTop: 8, fontSize: 12, color: '#64748b',
                                fontStyle: 'italic', lineHeight: 1.5,
                                padding: '6px 10px',
                                background: '#f8fafc',
                                borderRadius: 6,
                                borderLeft: '3px solid #e2e8f0',
                              }}>
                                {item.notes}
                              </div>
                            )}
                          </div>

                          {/* Line total */}
                          <div style={{
                            fontSize: 16, fontWeight: 800, color: '#0f172a',
                            whiteSpace: 'nowrap',
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            ${lineTotal.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Totals block */}
                <div style={{
                  marginTop: 12, paddingTop: 14,
                  borderTop: '2px solid #e2e8f0',
                }}>
                  {Number(estimate.subtotal) > 0 && (
                    <TotalLine label="Subtotal" amount={Number(estimate.subtotal)} />
                  )}
                  {Number(estimate.tax_amount) > 0 && (
                    <TotalLine
                      label={taxRatePct ? `Tax (${taxRatePct}%)` : 'Tax'}
                      amount={Number(estimate.tax_amount)}
                    />
                  )}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginTop: 10, paddingTop: 10,
                    borderTop: '1px solid #e2e8f0',
                  }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                      Total
                    </span>
                    <span style={{
                      fontSize: 28, fontWeight: 900, color: '#0f172a',
                      fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                    }}>
                      ${Number(estimate.total).toFixed(2)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            ADVISOR MESSAGE
        ═══════════════════════════════════════════════════════════════════ */}
        {estimate.notes && (
          <section style={{ marginBottom: 8 }}>
            <div style={S.sectionHeader}>
              <span style={S.sectionIcon}>💬</span>
              Message from Your Advisor
            </div>
            <div style={{
              ...S.card,
              fontSize: 15, lineHeight: 1.7, color: '#334155',
              borderLeft: '4px solid #3b82f6',
              paddingLeft: 20,
            }}>
              {estimate.notes}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            CUSTOMER DECISION
        ═══════════════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: 8 }}>
          {canDecide && (
            <>
              <div style={S.sectionHeader}>
                <span style={S.sectionIcon}>✅</span>
                Your Decision
              </div>

              <div style={S.card}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                    Ready to proceed?
                  </div>
                  <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
                    Your authorization is needed to begin the repair.
                    <br />Approving this estimate authorizes the work listed above.
                  </div>
                </div>

                {error && (
                  <div style={{
                    marginBottom: 14, padding: '10px 14px',
                    background: '#fef2f2', border: '1px solid #fca5a5',
                    borderRadius: 10, fontSize: 13, color: '#b91c1c',
                  }}>
                    {error}
                  </div>
                )}

                {/* Approve button */}
                <button
                  onClick={handleApprove}
                  disabled={!!busy}
                  style={{
                    width: '100%', padding: '18px 16px', marginBottom: 12,
                    fontSize: 17, fontWeight: 800, borderRadius: 14,
                    border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
                    background: busy === 'approve'
                      ? '#15803d'
                      : 'linear-gradient(135deg, #16a34a, #15803d)',
                    color: '#fff',
                    opacity: busy && busy !== 'approve' ? 0.45 : 1,
                    transition: 'all 0.15s',
                    boxShadow: busy ? 'none' : '0 4px 12px rgba(22,163,74,0.35)',
                    letterSpacing: '0.01em',
                  }}
                >
                  {busy === 'approve' ? '…Approving' : '✓  Approve Estimate'}
                </button>

                {/* Decline button */}
                <button
                  onClick={handleDecline}
                  disabled={!!busy}
                  style={{
                    width: '100%', padding: '14px 16px',
                    fontSize: 14, fontWeight: 600, borderRadius: 14,
                    border: '1px solid #e2e8f0',
                    cursor: busy ? 'not-allowed' : 'pointer',
                    background: 'transparent',
                    color: '#94a3b8',
                    opacity: busy && busy !== 'decline' ? 0.45 : 1,
                    transition: 'all 0.15s',
                    letterSpacing: '0.01em',
                  }}
                >
                  {busy === 'decline' ? '…' : '✕  Not at this time'}
                </button>
              </div>
            </>
          )}

          {/* ── Approved confirmation ─────────────────────────────────────── */}
          {status === 'approved' && (
            <div style={{
              ...S.card,
              textAlign: 'center',
              background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
              border: '2px solid #86efac',
              padding: '28px 20px',
            }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#15803d', marginBottom: 8 }}>
                Estimate Approved!
              </div>
              <div style={{ fontSize: 14, color: '#166534', lineHeight: 1.6 }}>
                Thank you — we&apos;ve received your approval.
                <br />
                We&apos;ll get started on your vehicle right away and
                reach out with any updates.
              </div>
            </div>
          )}

          {/* ── Declined confirmation ─────────────────────────────────────── */}
          {status === 'declined' && (
            <div style={{
              ...S.card,
              textAlign: 'center',
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              padding: '28px 20px',
            }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>👍</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#9a3412', marginBottom: 8 }}>
                No Problem — Noted!
              </div>
              <div style={{ fontSize: 14, color: '#7c2d12', lineHeight: 1.6 }}>
                We&apos;ve recorded your response. A service advisor may follow up
                with alternative options or updated pricing.
                <br /><br />
                Feel free to reach out any time — we&apos;re here to help.
              </div>
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            CONTACT BUTTONS
        ═══════════════════════════════════════════════════════════════════ */}
        {shopPhone && (
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <a
              href={`tel:${shopPhone.replace(/\D/g, '')}`}
              style={{
                ...S.contactBtn,
                background: '#fff',
              }}
            >
              <span style={{ fontSize: 18 }}>📞</span>
              <span>Call Shop</span>
            </a>
            <a
              href={`sms:${shopPhone.replace(/\D/g, '')}`}
              style={{
                ...S.contactBtn,
                background: '#fff',
              }}
            >
              <span style={{ fontSize: 18 }}>💬</span>
              <span>Text Shop</span>
            </a>
          </div>
        )}

        {/* Bottom breathing room on mobile */}
        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FindingCard({
  rec,
  isCritical: critical,
}: {
  rec: Recommendation
  isCritical: boolean
}) {
  return (
    <div style={{
      marginBottom: 12,
      borderRadius: 14,
      border: critical ? '2px solid #fca5a5' : '1px solid #fde68a',
      background: critical ? '#fff5f5' : '#fffbeb',
      overflow: 'hidden',
    }}>
      {/* Critical header strip */}
      {critical && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px',
          background: 'linear-gradient(90deg, #fee2e2, #fecaca)',
          borderBottom: '1px solid #fca5a5',
        }}>
          <span style={{ fontSize: 16 }}>🚨</span>
          <span style={{
            fontSize: 11, fontWeight: 900, color: '#b91c1c',
            textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>
            Immediate Attention Required
          </span>
        </div>
      )}

      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>

          {/* Severity badge */}
          <span style={{
            flexShrink: 0, marginTop: 2,
            padding: '3px 9px', borderRadius: 6,
            fontSize: 10, fontWeight: 900,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            background: critical ? '#dc2626' : '#fef3c7',
            color:      critical ? '#fff'     : '#92400e',
            border:     critical ? '1px solid #b91c1c' : '1px solid #fcd34d',
          }}>
            {critical ? '⚠ Critical' : '! Warning'}
          </span>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Source item label */}
            {rec.item_name && rec.item_name !== rec.title && (
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>
                {rec.item_name}
              </div>
            )}

            {/* Finding title */}
            <div style={{
              fontSize: 15, fontWeight: 800, lineHeight: 1.3, marginBottom: 4,
              color: critical ? '#7f1d1d' : '#78350f',
            }}>
              {rec.title}
            </div>

            {/* Description */}
            {rec.description && (
              <div style={{
                fontSize: 13, lineHeight: 1.55,
                color: critical ? '#991b1b' : '#92400e',
                fontWeight: critical ? 500 : 400,
              }}>
                {rec.description}
              </div>
            )}

            {/* Technician note */}
            {rec.technician_notes && (
              <div style={{
                marginTop: 10, fontSize: 13, lineHeight: 1.55,
                fontStyle: 'italic',
                padding: '8px 12px',
                borderRadius: 8,
                background:  critical ? '#fff1f1' : '#fef9ec',
                borderLeft:  `3px solid ${critical ? '#fca5a5' : '#f59e0b'}`,
                color:        critical ? '#991b1b' : '#78350f',
              }}>
                <strong style={{ fontStyle: 'normal', marginRight: 4 }}>Tech Note:</strong>
                {rec.technician_notes}
              </div>
            )}

            {/* Section name */}
            {rec.section_name && (
              <div style={{ marginTop: 8 }}>
                <span style={{
                  fontSize: 10, color: '#94a3b8',
                  padding: '2px 7px', borderRadius: 4,
                  background: critical ? '#fff' : '#fff',
                  border: '1px solid #e2e8f0',
                }}>
                  {rec.section_name}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TotalLine({ label, amount }: { label: string; amount: number }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '4px 0',
    }}>
      <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: 14, color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
        ${amount.toFixed(2)}
      </span>
    </div>
  )
}

// ── Shared style tokens ────────────────────────────────────────────────────────

const S = {
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '18px 16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)',
    marginBottom: 16,
  } as React.CSSProperties,

  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    fontWeight: 900,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: '#64748b',
    marginBottom: 10,
    paddingLeft: 2,
  } as React.CSSProperties,

  sectionIcon: {
    fontSize: 14,
  } as React.CSSProperties,

  label: {
    fontSize: 10,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginBottom: 3,
  } as React.CSSProperties,

  value: {
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
  } as React.CSSProperties,

  sub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  } as React.CSSProperties,

  contactBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '14px 12px',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    color: '#334155',
    fontSize: 14,
    fontWeight: 700,
    textDecoration: 'none',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  } as React.CSSProperties,
}
