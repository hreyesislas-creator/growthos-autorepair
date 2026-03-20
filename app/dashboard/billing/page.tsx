import { getDashboardTenant } from '@/lib/tenant'
import { getBillingSnapshot, getBillingEvents } from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { format } from 'date-fns'

export const metadata = { title: 'Billing' }

export default async function BillingPage() {
  const ctx      = await getDashboardTenant()
  const tenantId = ctx?.tenant.id ?? ''
  const [snapshot, events] = await Promise.all([
    getBillingSnapshot(tenantId),
    getBillingEvents(tenantId),
  ])

  const rows = snapshot ? [
    { label: "Current Plan",      value: snapshot.plan },
    { label: "Status",            value: <StatusBadge status={snapshot.status} /> },
    { label: "Monthly Amount",    value: snapshot.monthly_amount ? `$${snapshot.monthly_amount.toFixed(2)}` : "—" },
    { label: "Next Billing Date", value: snapshot.next_billing_date ? format(new Date(snapshot.next_billing_date), "MMM d, yyyy") : "—" },
    { label: "Last Payment",      value: snapshot.last_payment_date ? format(new Date(snapshot.last_payment_date), "MMM d, yyyy") : "—" },
    { label: "Last Amount",       value: snapshot.last_payment_amount ? `$${snapshot.last_payment_amount.toFixed(2)}` : "—" },
    { label: "Grace Period",      value: snapshot.grace_period_ends_at ? format(new Date(snapshot.grace_period_ends_at), "MMM d, yyyy") : "—" },
  ] : []

  return (
    <>
      <Topbar title="Billing" />
      <div className="dash-content">
        <div className="two-col">

          <div className="billing-card">
            <div className="section-title" style={{ marginBottom: "16px" }}>Account Overview</div>
            {!snapshot ? (
              <div className="empty-state">
                <div className="empty-state-icon">💳</div>
                <div className="empty-state-title">No billing data</div>
                <div className="empty-state-body">Billing information will appear here once your subscription is set up.</div>
              </div>
            ) : (
              rows.map(r => (
                <div key={r.label} className="billing-row">
                  <span className="billing-row-label">{r.label}</span>
                  <span className="billing-row-value">{r.value}</span>
                </div>
              ))
            )}
          </div>

          <div className="billing-card">
            <div className="section-title" style={{ marginBottom: "14px" }}>Payment History</div>
            {events.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <div className="empty-state-title">No events yet</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {events.map(e => (
                  <div key={e.id} className="billing-row">
                    <div>
                      <div className="billing-row-label">{e.event_type.replace(/_/g, " ")}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-3)" }}>
                        {format(new Date(e.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                    <span className="billing-row-value">
                      {e.amount ? `$${e.amount.toFixed(2)}` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
