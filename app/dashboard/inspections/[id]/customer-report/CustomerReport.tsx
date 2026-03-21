'use client'

import { useState } from 'react'
import type {
  Inspection,
  ServiceRecommendation,
  Customer,
  Vehicle,
  BusinessProfile,
} from '@/lib/types'
import {
  updateRecommendationStatus,
  type RecommendationStatus,
} from '../../actions'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  inspection:      Inspection
  recommendations: ServiceRecommendation[]
  customer:        Customer | null
  vehicle:         Vehicle  | null
  profile:         BusinessProfile | null
  inspectionId:    string
}

// ── Design tokens — light, customer-facing theme ──────────────────────────────
// These are intentionally separate from the dark dashboard CSS variables.

const T = {
  pageBg:         '#f0f4f8',
  white:          '#ffffff',
  border:         '#e2e8f0',
  borderLight:    '#f1f5f9',
  text:           '#0f172a',
  textMid:        '#475569',
  textLight:      '#94a3b8',
  criticalRed:    '#dc2626',
  criticalBg:     '#fff1f1',
  criticalBorder: '#fca5a5',
  attentionAmber: '#d97706',
  attentionBg:    '#fffbeb',
  attentionBorder:'#fde68a',
  goodGreen:      '#16a34a',
  goodBg:         '#f0fdf4',
  goodBorder:     '#bbf7d0',
  approvedGreen:  '#15803d',
  declinedGray:   '#64748b',
  blue:           '#0070C9',
  shadow:         '0 2px 12px rgba(15,23,42,0.07)',
  shadowMd:       '0 4px 24px rgba(15,23,42,0.10)',
  r:              '12px',
  rSm:            '8px',
  font:           "'DM Sans', 'Inter', -apple-system, sans-serif",
}

// ── Priority helpers ──────────────────────────────────────────────────────────

function getPriorityConfig(priority: string) {
  if (priority === 'high' || priority === 'urgent') {
    return {
      label:       'Critical Priority',
      icon:        '⚠',
      accentColor: T.criticalRed,
      badgeBg:     T.criticalBg,
      badgeColor:  T.criticalRed,
      badgeBorder: T.criticalBorder,
      sectionBg:   T.criticalBg,
    }
  }
  return {
    label:       'Recommended',
    icon:        '●',
    accentColor: T.attentionAmber,
    badgeBg:     T.attentionBg,
    badgeColor:  T.attentionAmber,
    badgeBorder: T.attentionBorder,
    sectionBg:   T.attentionBg,
  }
}

// ── Decision helpers ──────────────────────────────────────────────────────────

function resolveDecisionState(status: string) {
  const isApproved = status === 'accepted' || status === 'approved'
  const isDeclined = status === 'rejected' || status === 'declined'
  const isCompleted = status === 'completed'
  const isDecided   = isApproved || isDeclined || isCompleted
  return { isApproved, isDeclined, isCompleted, isDecided }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CustomerReport({
  inspection,
  recommendations,
  customer,
  vehicle,
  profile,
  inspectionId,
}: Props) {

  // ── Decision state (optimistic) ────────────────────────────────────────────
  const [decisions, setDecisions] = useState<Record<string, RecommendationStatus>>(
    () => Object.fromEntries(
      recommendations.map(r => [r.id, r.status as RecommendationStatus])
    )
  )
  const [inFlight,   setInFlight]   = useState<Set<string>>(new Set())
  const [recErrors,  setRecErrors]  = useState<Record<string, string>>({})

  // ── Derived data ───────────────────────────────────────────────────────────

  const urgentRecs    = recommendations.filter(r => r.priority === 'high' || r.priority === 'urgent')
  const attentionRecs = recommendations.filter(r => r.priority !== 'high' && r.priority !== 'urgent')

  const totalItems    = inspection.total_items    ?? 0
  const criticalCount = inspection.critical_count ?? 0
  const warningCount  = inspection.warning_count  ?? 0
  const goodCount     = Math.max(0, totalItems - criticalCount - warningCount)

  const vehicleLabel = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')
    : 'Vehicle'

  const customerName = customer
    ? `${customer.first_name} ${customer.last_name}`.trim()
    : null

  const reportDate = inspection.completed_at ?? inspection.updated_at ?? inspection.created_at
  const formattedDate = reportDate
    ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        .format(new Date(reportDate))
    : '—'

  const shopName    = profile?.business_name ?? 'Auto Service Center'
  const shopPhone   = profile?.phone ?? ''
  const shopAddress = [
    profile?.address_street,
    profile?.address_city,
    profile?.address_state,
    profile?.address_zip,
  ].filter(Boolean).join(', ')
  const brandColor  = profile?.primary_color ?? T.blue
  const logoUrl     = profile?.logo_url ?? null
  const logoInitials = shopName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  const isCompleted = inspection.status === 'completed'

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleDecision(recId: string, newStatus: RecommendationStatus) {
    const previous = decisions[recId]
    // Optimistic
    setDecisions(prev => ({ ...prev, [recId]: newStatus }))
    setRecErrors(prev => ({ ...prev, [recId]: '' }))
    setInFlight(prev => { const n = new Set(prev); n.add(recId); return n })

    const result = await updateRecommendationStatus(recId, newStatus)

    setInFlight(prev => { const n = new Set(prev); n.delete(recId); return n })

    if (result?.error) {
      setDecisions(prev => ({ ...prev, [recId]: previous }))
      setRecErrors(prev => ({ ...prev, [recId]: result.error }))
    }
  }

  // ── Recommendation card ────────────────────────────────────────────────────

  function RecCard({ rec }: { rec: ServiceRecommendation }) {
    const priority = getPriorityConfig(rec.priority ?? 'medium')
    const status   = decisions[rec.id] ?? rec.status
    const { isApproved, isDeclined, isCompleted: recCompleted, isDecided } = resolveDecisionState(status)
    const busy     = inFlight.has(rec.id)
    const err      = recErrors[rec.id]

    const priceDisplay = rec.estimated_price != null
      ? `$${Number(rec.estimated_price).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
      : null

    return (
      <div style={{
        background:   T.white,
        borderRadius: T.r,
        boxShadow:    T.shadow,
        overflow:     'hidden',
        border:       `1px solid ${T.border}`,
        // Left accent bar color-coded by priority
        borderLeft:   `4px solid ${priority.accentColor}`,
        marginBottom: 12,
      }}>
        <div style={{ padding: '20px 22px' }}>

          {/* ── Row 1: priority badge + title + price ── */}
          <div style={{
            display:        'flex',
            alignItems:     'flex-start',
            gap:            10,
            flexWrap:       'wrap',
            marginBottom:   10,
          }}>
            {/* Priority badge */}
            <span style={{
              display:       'inline-flex',
              alignItems:    'center',
              gap:           4,
              padding:       '3px 8px',
              borderRadius:  6,
              fontSize:      10,
              fontWeight:    700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              flexShrink:    0,
              background:    priority.badgeBg,
              color:         priority.badgeColor,
              border:        `1px solid ${priority.badgeBorder}`,
            }}>
              {priority.icon} {priority.label}
            </span>

            {/* Title */}
            <div style={{ flex: 1, minWidth: 160 }}>
              <span style={{
                fontSize:   15,
                fontWeight: 700,
                color:      T.text,
                lineHeight: 1.3,
              }}>
                {rec.title}
              </span>
            </div>

            {/* Price */}
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              {priceDisplay ? (
                <span style={{
                  fontSize:   17,
                  fontWeight: 700,
                  color:      T.text,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {priceDisplay}
                </span>
              ) : (
                <span style={{
                  fontSize:  12,
                  color:     T.textLight,
                  fontStyle: 'italic',
                }}>
                  Contact us for pricing
                </span>
              )}
            </div>
          </div>

          {/* ── Row 2: description ── */}
          {rec.description && (
            <p style={{
              fontSize:     14,
              color:        T.textMid,
              lineHeight:   1.65,
              margin:       '0 0 14px',
            }}>
              {rec.description}
            </p>
          )}

          {/* ── Row 3: decided state or action buttons ── */}
          {isDecided ? (
            <div style={{
              display:     'flex',
              alignItems:  'center',
              gap:         12,
              flexWrap:    'wrap',
              marginTop:   4,
            }}>
              {/* Decision badge */}
              {isApproved || recCompleted ? (
                <span style={{
                  display:       'inline-flex',
                  alignItems:    'center',
                  gap:           5,
                  padding:       '6px 14px',
                  borderRadius:  20,
                  fontSize:      13,
                  fontWeight:    700,
                  background:    T.goodBg,
                  color:         T.approvedGreen,
                  border:        `1px solid ${T.goodBorder}`,
                }}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <circle cx="6.5" cy="6.5" r="6" stroke={T.approvedGreen} strokeWidth="1.2"/>
                    <path d="M4 6.5l2 2 3-3" stroke={T.approvedGreen} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {recCompleted ? 'Completed' : 'Service Approved'}
                </span>
              ) : isDeclined ? (
                <span style={{
                  display:       'inline-flex',
                  alignItems:    'center',
                  gap:           5,
                  padding:       '6px 14px',
                  borderRadius:  20,
                  fontSize:      13,
                  fontWeight:    600,
                  background:    '#f8fafc',
                  color:         T.declinedGray,
                  border:        `1px solid ${T.border}`,
                }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5.5" stroke={T.declinedGray} strokeWidth="1.2"/>
                    <path d="M4 4l4 4M8 4l-4 4" stroke={T.declinedGray} strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Declined
                </span>
              ) : null}

              {/* Change decision link */}
              {!recCompleted && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDecision(rec.id, 'pending')}
                  style={{
                    background:  'transparent',
                    border:      'none',
                    cursor:      busy ? 'default' : 'pointer',
                    fontSize:    12,
                    color:       T.textLight,
                    textDecoration: 'underline',
                    padding:     0,
                    opacity:     busy ? 0.5 : 1,
                    fontFamily:  T.font,
                  }}
                >
                  {busy ? 'Updating…' : 'Change decision'}
                </button>
              )}
            </div>
          ) : (
            /* ── Undecided — show Approve / Decline buttons ── */
            <div style={{
              display:   'flex',
              gap:       10,
              flexWrap:  'wrap',
              marginTop: 4,
            }}>
              {/* Approve */}
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDecision(rec.id, 'accepted')}
                style={{
                  flex:          '1 1 140px',
                  display:       'flex',
                  alignItems:    'center',
                  justifyContent:'center',
                  gap:           6,
                  padding:       '11px 18px',
                  borderRadius:  T.rSm,
                  border:        'none',
                  background:    busy ? '#d1fae5' : T.goodGreen,
                  color:         '#fff',
                  fontSize:      14,
                  fontWeight:    700,
                  cursor:        busy ? 'default' : 'pointer',
                  transition:    'background 0.15s, transform 0.1s',
                  fontFamily:    T.font,
                }}
                onMouseEnter={e => !busy && ((e.target as HTMLElement).style.background = '#15803d')}
                onMouseLeave={e => !busy && ((e.target as HTMLElement).style.background = T.goodGreen)}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {busy ? 'Saving…' : 'Approve Service'}
              </button>

              {/* Decline */}
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDecision(rec.id, 'rejected')}
                style={{
                  flex:          '1 1 100px',
                  display:       'flex',
                  alignItems:    'center',
                  justifyContent:'center',
                  gap:           6,
                  padding:       '11px 18px',
                  borderRadius:  T.rSm,
                  border:        `1.5px solid ${T.border}`,
                  background:    T.white,
                  color:         T.textMid,
                  fontSize:      14,
                  fontWeight:    600,
                  cursor:        busy ? 'default' : 'pointer',
                  transition:    'border-color 0.15s',
                  fontFamily:    T.font,
                  opacity:       busy ? 0.5 : 1,
                }}
                onMouseEnter={e => !busy && ((e.target as HTMLElement).style.borderColor = T.textMid)}
                onMouseLeave={e => !busy && ((e.target as HTMLElement).style.borderColor = T.border)}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                Decline
              </button>
            </div>
          )}

          {/* Error */}
          {err && (
            <p style={{ fontSize: 12, color: T.criticalRed, margin: '8px 0 0' }}>
              {err}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Print + responsive styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: ${T.pageBg}; font-family: ${T.font}; -webkit-font-smoothing: antialiased; }
        .rpt-no-print { }
        @media print {
          body { background: white !important; }
          .rpt-no-print { display: none !important; }
          .rpt-card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; break-inside: avoid; }
          .rpt-page { padding-top: 0 !important; }
        }
        @media (max-width: 540px) {
          .rpt-health-grid { grid-template-columns: 1fr 1fr 1fr !important; }
          .rpt-meta-grid   { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <div className="rpt-page" style={{
        minHeight:   '100vh',
        background:  T.pageBg,
        fontFamily:  T.font,
        color:       T.text,
        paddingBottom: 48,
      }}>

        {/* ══════════════════════════════════════════════════════════════
            HEADER — shop branding + back link
        ══════════════════════════════════════════════════════════════ */}
        <header style={{
          background:   T.white,
          borderBottom: `1px solid ${T.border}`,
          padding:      '14px 24px',
          display:      'flex',
          alignItems:   'center',
          gap:          14,
        }}>
          {/* Logo */}
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={shopName}
              style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width:          40,
              height:         40,
              borderRadius:   8,
              background:     brandColor,
              color:          '#fff',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       14,
              fontWeight:     700,
              flexShrink:     0,
              letterSpacing:  '0.03em',
            }}>
              {logoInitials}
            </div>
          )}

          {/* Shop info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
              {shopName}
            </div>
            {(shopPhone || shopAddress) && (
              <div style={{ fontSize: 12, color: T.textMid, marginTop: 2 }}>
                {shopPhone && <span>{shopPhone}</span>}
                {shopPhone && shopAddress && <span style={{ margin: '0 6px', color: T.textLight }}>·</span>}
                {shopAddress && <span>{shopAddress}</span>}
              </div>
            )}
          </div>

          {/* Internal nav — hidden on print */}
          <div className="rpt-no-print" style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => window.print()}
              title="Print report"
              style={{
                display:       'flex',
                alignItems:    'center',
                gap:           5,
                padding:       '6px 12px',
                borderRadius:  6,
                border:        `1px solid ${T.border}`,
                background:    T.white,
                color:         T.textMid,
                fontSize:      12,
                fontWeight:    500,
                cursor:        'pointer',
                fontFamily:    T.font,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="2" y="4" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M4 4V2h5v2" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M4 9h5M4 11h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              Print
            </button>
            <a
              href={`/dashboard/inspections/${inspectionId}`}
              style={{
                display:        'flex',
                alignItems:     'center',
                gap:            4,
                padding:        '6px 12px',
                borderRadius:   6,
                border:         `1px solid ${T.border}`,
                background:     T.white,
                color:          T.textMid,
                fontSize:       12,
                fontWeight:     500,
                textDecoration: 'none',
              }}
            >
              ← Inspection
            </a>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════════
            CONTENT container
        ══════════════════════════════════════════════════════════════ */}
        <div style={{
          maxWidth:  720,
          margin:    '0 auto',
          padding:   '28px 16px 0',
        }}>

          {/* ── Vehicle summary card ──────────────────────────────────── */}
          <div className="rpt-card" style={{
            background:   T.white,
            borderRadius: T.r,
            boxShadow:    T.shadow,
            border:       `1px solid ${T.border}`,
            padding:      '24px 26px',
            marginBottom: 16,
          }}>
            {/* eyebrow */}
            <div style={{
              fontSize:      10,
              fontWeight:    700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         brandColor,
              marginBottom:  8,
            }}>
              Digital Vehicle Inspection Report
            </div>

            {/* Vehicle name */}
            <div style={{
              fontSize:     26,
              fontWeight:   700,
              color:        T.text,
              lineHeight:   1.2,
              marginBottom: 16,
            }}>
              {vehicleLabel}
            </div>

            {/* Meta grid */}
            <div
              className="rpt-meta-grid"
              style={{
                display:             'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap:                 '10px 20px',
                marginBottom:        16,
              }}
            >
              {customerName && (
                <MetaField label="Customer" value={customerName} />
              )}
              <MetaField label="Inspection Date" value={formattedDate} />
              {vehicle?.vin && (
                <MetaField label="VIN" value={`…${vehicle.vin.slice(-8).toUpperCase()}`} mono />
              )}
              {vehicle?.mileage != null && (
                <MetaField
                  label="Mileage"
                  value={vehicle.mileage.toLocaleString('en-US') + ' mi'}
                />
              )}
              {vehicle?.color && (
                <MetaField label="Color" value={vehicle.color} />
              )}
            </div>

            {/* Status chip */}
            <div>
              {isCompleted ? (
                <span style={{
                  display:       'inline-flex',
                  alignItems:    'center',
                  gap:           5,
                  padding:       '4px 12px',
                  borderRadius:  20,
                  fontSize:      12,
                  fontWeight:    600,
                  background:    T.goodBg,
                  color:         T.approvedGreen,
                  border:        `1px solid ${T.goodBorder}`,
                }}>
                  ✓ Inspection Complete
                </span>
              ) : (
                <span style={{
                  display:       'inline-flex',
                  alignItems:    'center',
                  gap:           5,
                  padding:       '4px 12px',
                  borderRadius:  20,
                  fontSize:      12,
                  fontWeight:    600,
                  background:    '#eff6ff',
                  color:         T.blue,
                  border:        `1px solid #bfdbfe`,
                }}>
                  ● In Progress
                </span>
              )}
            </div>
          </div>

          {/* ── Health summary — 3 tiles ──────────────────────────────── */}
          {totalItems > 0 && (
            <div
              className="rpt-health-grid"
              style={{
                display:             'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap:                 10,
                marginBottom:        24,
              }}
            >
              <HealthTile
                count={criticalCount}
                label="Critical"
                icon="⚠"
                bg={T.criticalBg}
                color={T.criticalRed}
                border={T.criticalBorder}
                bold={criticalCount > 0}
              />
              <HealthTile
                count={warningCount}
                label="Needs Attention"
                icon="●"
                bg={T.attentionBg}
                color={T.attentionAmber}
                border={T.attentionBorder}
                bold={warningCount > 0}
              />
              <HealthTile
                count={goodCount}
                label="Good"
                icon="✓"
                bg={T.goodBg}
                color={T.goodGreen}
                border={T.goodBorder}
                bold={false}
              />
            </div>
          )}

          {/* ── Recommendations — or All Clear ───────────────────────── */}
          {recommendations.length === 0 ? (
            /* All good! */
            <div className="rpt-card" style={{
              background:   T.goodBg,
              border:       `1px solid ${T.goodBorder}`,
              borderRadius: T.r,
              padding:      '36px 28px',
              textAlign:    'center',
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.approvedGreen, marginBottom: 6 }}>
                Your vehicle passed inspection!
              </div>
              <p style={{ fontSize: 14, color: '#166534', margin: 0 }}>
                No service recommendations at this time. See you at your next visit.
              </p>
            </div>
          ) : (
            <>
              {/* Critical / urgent section */}
              {urgentRecs.length > 0 && (
                <section style={{ marginBottom: 28 }}>
                  <SectionHeader
                    icon="⚠"
                    title="Requires Immediate Attention"
                    subtitle="These items affect your safety and should be addressed as soon as possible."
                    color={T.criticalRed}
                    bg={T.criticalBg}
                    border={T.criticalBorder}
                  />
                  {urgentRecs.map(rec => (
                    <RecCard key={rec.id} rec={rec} />
                  ))}
                </section>
              )}

              {/* Attention / recommended section */}
              {attentionRecs.length > 0 && (
                <section style={{ marginBottom: 28 }}>
                  <SectionHeader
                    icon="●"
                    title="Recommended Service"
                    subtitle="These items should be addressed to keep your vehicle running at its best."
                    color={T.attentionAmber}
                    bg={T.attentionBg}
                    border={T.attentionBorder}
                  />
                  {attentionRecs.map(rec => (
                    <RecCard key={rec.id} rec={rec} />
                  ))}
                </section>
              )}
            </>
          )}

          {/* ── Disclaimer ────────────────────────────────────────────── */}
          <p style={{
            fontSize:  12,
            color:     T.textLight,
            textAlign: 'center',
            lineHeight:1.6,
            marginTop: 8,
          }}>
            Prices shown are estimates and may vary based on final diagnosis.
            Contact {shopName} for an exact quote before authorizing service.
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════════════════════════ */}
        <footer style={{
          borderTop:  `1px solid ${T.border}`,
          background: T.white,
          marginTop:  40,
          padding:    '20px 24px',
          textAlign:  'center',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>
            {shopName}
          </div>
          {shopAddress && (
            <div style={{ fontSize: 12, color: T.textMid }}>{shopAddress}</div>
          )}
          {shopPhone && (
            <a
              href={`tel:${shopPhone.replace(/\D/g, '')}`}
              style={{ fontSize: 12, color: T.blue, textDecoration: 'none', display: 'block', marginTop: 2 }}
            >
              {shopPhone}
            </a>
          )}
          <div style={{ fontSize: 11, color: T.textLight, marginTop: 10 }}>
            This report was prepared exclusively for {customerName ?? 'you'}.
            Please keep it for your records.
          </div>
        </footer>

      </div>
    </>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MetaField({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <div style={{
        fontSize:      10,
        fontWeight:    600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color:         T.textLight,
        marginBottom:  2,
      }}>
        {label}
      </div>
      <div style={{
        fontSize:   14,
        fontWeight: 600,
        color:      T.text,
        fontFamily: mono ? "'DM Mono', monospace" : T.font,
      }}>
        {value}
      </div>
    </div>
  )
}

function HealthTile({
  count,
  label,
  icon,
  bg,
  color,
  border,
  bold,
}: {
  count: number
  label: string
  icon:  string
  bg:    string
  color: string
  border:string
  bold:  boolean
}) {
  return (
    <div className="rpt-card" style={{
      background:   bold ? bg : T.white,
      border:       `1px solid ${bold ? border : T.border}`,
      borderRadius: T.r,
      padding:      '14px 16px',
      textAlign:    'center',
    }}>
      <div style={{
        fontSize:   28,
        fontWeight: 800,
        color:      bold ? color : T.textMid,
        lineHeight: 1,
        marginBottom: 4,
      }}>
        {count}
      </div>
      <div style={{
        fontSize:   11,
        fontWeight: 600,
        color:      bold ? color : T.textLight,
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap:        4,
      }}>
        <span>{icon}</span>
        <span>{label}</span>
      </div>
    </div>
  )
}

function SectionHeader({
  icon,
  title,
  subtitle,
  color,
  bg,
  border,
}: {
  icon:     string
  title:    string
  subtitle: string
  color:    string
  bg:       string
  border:   string
}) {
  return (
    <div style={{
      background:   bg,
      border:       `1px solid ${border}`,
      borderRadius: T.rSm,
      padding:      '12px 16px',
      marginBottom: 12,
      display:      'flex',
      gap:          10,
      alignItems:   'flex-start',
    }}>
      <span style={{ fontSize: 18, lineHeight: 1.3, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color, marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color, opacity: 0.8, lineHeight: 1.5 }}>
          {subtitle}
        </div>
      </div>
    </div>
  )
}
