import { getDashboardTenant } from '@/lib/tenant'
import { getFinancialDashboardData } from '@/lib/financial-queries'
import Topbar from '@/components/dashboard/Topbar'
import Link from 'next/link'

export const metadata = { title: 'Financials' }

function fmtMoney(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function labelPaymentMethod(raw: string) {
  if (!raw || raw === 'other') return 'Other'
  const s = raw.replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default async function FinancialsPage() {
  const ctx = await getDashboardTenant()
  const tenantId = ctx?.tenant.id ?? ''
  const data = await getFinancialDashboardData(tenantId)

  const methodSum = data.revenueByPaymentMethod.reduce((s, r) => s + r.amount, 0)
  const parts = data.partsTotalLast30d
  const labor = data.laborTotalLast30d
  const splitTotal = parts + labor
  const partsPct = splitTotal > 0 ? Math.round((parts / splitTotal) * 1000) / 10 : 0
  const laborPct = splitTotal > 0 ? Math.round((labor / splitTotal) * 1000) / 10 : 0

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'var(--text-3)',
    marginBottom: 12,
  }

  const row1 = [
    { label: 'Revenue today', value: fmtMoney(data.revenueToday), hint: 'Collected' },
    { label: 'Revenue this week', value: fmtMoney(data.revenueThisWeek), hint: 'Collected' },
    { label: 'Revenue this month', value: fmtMoney(data.revenueThisMonth), hint: 'Collected' },
    { label: 'Outstanding balance', value: fmtMoney(data.outstandingBalance), hint: 'Open invoices' },
  ]

  const row2 = [
    { label: 'Average ticket', value: fmtMoney(data.averageTicketPaid), hint: 'Paid invoices' },
    { label: 'Parts revenue', value: fmtMoney(data.partsTotalLast30d), hint: 'Last 30 days' },
    { label: 'Labor revenue', value: fmtMoney(data.laborTotalLast30d), hint: 'Last 30 days' },
    {
      label: 'Revenue collected',
      value: fmtMoney(data.revenueTotal),
      hint: 'All recorded payments',
    },
  ]

  return (
    <>
      <Topbar title="Financials" subtitle="Revenue, balances, and payment performance" />
      <div className="dash-content" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        <div className="kpi-grid" style={{ marginBottom: 14 }}>
          {row1.map(k => (
            <div key={k.label} className="kpi-card" style={{ minWidth: 0 }}>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ fontSize: 26, fontFamily: 'var(--font-mono)' }}>
                {k.value}
              </div>
              <div className="kpi-sub">{k.hint}</div>
            </div>
          ))}
        </div>

        <div className="kpi-grid" style={{ marginBottom: 28 }}>
          {row2.map(k => (
            <div key={k.label} className="kpi-card" style={{ minWidth: 0 }}>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ fontSize: 26, fontFamily: 'var(--font-mono)' }}>
                {k.value}
              </div>
              <div className="kpi-sub">{k.hint}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div className="card" style={{ padding: '18px 18px 16px', minWidth: 0 }}>
            <div style={{ ...sectionLabel, marginBottom: 8 }}>Revenue by payment method</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>
              Share of recorded payments in your ledger
            </div>
            {data.revenueByPaymentMethod.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 12px' }}>
                <div className="empty-state-title" style={{ fontSize: 14 }}>
                  No payments yet
                </div>
                <div className="empty-state-body" style={{ fontSize: 12 }}>
                  Record a payment on an invoice to see breakdown here.
                </div>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {data.revenueByPaymentMethod.map(row => {
                  const pct = methodSum > 0 ? Math.round((row.amount / methodSum) * 1000) / 10 : 0
                  return (
                    <li
                      key={row.method}
                      style={{
                        padding: '10px 0',
                        borderBottom: '1px solid var(--border-2)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          gap: 10,
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          {labelPaymentMethod(row.method)}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--text)',
                          }}
                        >
                          {fmtMoney(row.amount)}
                        </span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          borderRadius: 4,
                          background: 'var(--border-2)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, pct)}%`,
                            borderRadius: 4,
                            background: 'linear-gradient(90deg, #16a34a, #22c55e)',
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{pct}%</div>
                    </li>
                  )
                })}
              </ul>
            )}
            <div style={{ marginTop: 14 }}>
              <Link href="/dashboard/invoices" className="btn-ghost" style={{ fontSize: 12 }}>
                View invoices
              </Link>
            </div>
          </div>

          <div className="card" style={{ padding: '18px 18px 16px', minWidth: 0 }}>
            <div style={{ ...sectionLabel, marginBottom: 8 }}>Parts vs labor</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>
              From paid invoices updated in the last 30 days
            </div>
            {splitTotal <= 0 ? (
              <div className="empty-state" style={{ padding: '20px 12px' }}>
                <div className="empty-state-title" style={{ fontSize: 14 }}>
                  No split data yet
                </div>
                <div className="empty-state-body" style={{ fontSize: 12 }}>
                  Parts and labor totals appear when paid invoices include line splits.
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'flex',
                    height: 12,
                    borderRadius: 6,
                    overflow: 'hidden',
                    marginBottom: 16,
                    border: '1px solid var(--border-2)',
                  }}
                >
                  <div
                    style={{
                      width: `${partsPct}%`,
                      background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
                      minWidth: partsPct > 0 ? 4 : 0,
                    }}
                    title={`Parts ${partsPct}%`}
                  />
                  <div
                    style={{
                      width: `${laborPct}%`,
                      background: 'linear-gradient(180deg, #a855f7, #7c3aed)',
                      minWidth: laborPct > 0 ? 4 : 0,
                    }}
                    title={`Labor ${laborPct}%`}
                  />
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: '#2563eb',
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Parts</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {fmtMoney(parts)} · {partsPct}%
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: '#7c3aed',
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Labor</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {fmtMoney(labor)} · {laborPct}%
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
