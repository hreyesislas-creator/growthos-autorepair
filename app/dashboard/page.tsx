import { getDashboardTenant } from '@/lib/tenant'
import {
  getTodayAppointments, getCustomerCount, getVehicleCount,
  getPendingInspectionCount, getWeeklyMessageCount, getBillingSnapshot,
} from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import StatusBadge from '@/components/dashboard/StatusBadge'
import Link from 'next/link'
import { format } from 'date-fns'

export const metadata = { title: 'Overview' }

export default async function DashboardPage() {
  // Auth already confirmed by layout — no need to call getUser() again here
  const ctx      = await getDashboardTenant()
  const tenantId = ctx?.tenant.id ?? ''
  const today    = format(new Date(), "EEEE, MMM d")

  const [todayAppts, custCount, vehCount, pendingInsp, msgCount, billing] =
    await Promise.all([
      getTodayAppointments(tenantId),
      getCustomerCount(tenantId),
      getVehicleCount(tenantId),
      getPendingInspectionCount(tenantId),
      getWeeklyMessageCount(tenantId),
      getBillingSnapshot(tenantId),
    ])

  const kpis = [
    { label: "Appointments Today",  value: todayAppts.length, sub: "scheduled",       href: "/dashboard/appointments"    },
    { label: "Active Customers",    value: custCount,         sub: "in system",        href: "/dashboard/customers"       },
    { label: "Vehicles in System",  value: vehCount,          sub: "tracked",          href: "/dashboard/vehicles"        },
    { label: "Pending Inspections", value: pendingInsp,       sub: "awaiting review",  href: "/dashboard/inspections"     },
    { label: "Messages This Week",  value: msgCount,          sub: "sent",             href: "/dashboard/communications"  },
  ]

  const quickActions = [
    { label: "New Appointment", icon: "\u{1F4C5}", href: "/dashboard/appointments"   },
    { label: "Add Customer",    icon: "\u{1F464}", href: "/dashboard/customers"       },
    { label: "Add Vehicle",     icon: "\u{1F697}", href: "/dashboard/vehicles"        },
    { label: "Inspection",      icon: "\u{1F50D}", href: "/dashboard/inspections"     },
    { label: "Send Message",    icon: "\u{1F4AC}", href: "/dashboard/communications"  },
    { label: "Edit Website",    icon: "\u{1F310}", href: "/dashboard/website"         },
  ]

  return (
    <>
      <Topbar title="Overview" subtitle={today} />
      <div className="dash-content">

        <div className="kpi-grid">
          {kpis.map(k => (
            <Link key={k.label} href={k.href} style={{ textDecoration: "none" }}>
              <div className="kpi-card">
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-value">{k.value}</div>
                <div className="kpi-sub">{k.sub}</div>
              </div>
            </Link>
          ))}
          {billing && (
            <Link href="/dashboard/billing" style={{ textDecoration: "none" }}>
              <div className="kpi-card">
                <div className="kpi-label">Billing Status</div>
                <div style={{ marginTop: "8px" }}><StatusBadge status={billing.status} /></div>
                <div className="kpi-sub" style={{ marginTop: "6px" }}>
                  {billing.plan} plan{billing.monthly_amount ? ` · $${billing.monthly_amount}/mo` : ""}
                </div>
              </div>
            </Link>
          )}
        </div>

        <div className="two-col">
          <div className="card">
            <div className="section-header">
              <div>
                <div className="section-title">Today&apos;s Appointments</div>
                <div className="section-subtitle">{today}</div>
              </div>
              <Link href="/dashboard/appointments" className="btn-ghost">View all</Link>
            </div>
            {todayAppts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <div className="empty-state-title">No appointments today</div>
                <div className="empty-state-body">Schedule an appointment to see it here.</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Time</th><th>Customer</th><th>Vehicle</th><th>Service</th><th>Status</th></tr></thead>
                  <tbody>
                    {todayAppts.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-3)" }}>
                          {a.appointment_time
                            ? format(new Date(`2000-01-01T${a.appointment_time}`), "h:mm a")
                            : "—"}
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--text)" }}>
                          {a.customer ? `${a.customer.first_name} ${a.customer.last_name}` : "—"}
                        </td>
                        <td>{a.vehicle ? `${a.vehicle.year ?? ""} ${a.vehicle.make ?? ""} ${a.vehicle.model ?? ""}`.trim() : "—"}</td>
                        <td>{a.requested_service ?? "—"}</td>
                        <td><StatusBadge status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <div className="section-title" style={{ marginBottom: "14px" }}>Quick Actions</div>
            <div className="quick-actions">
              {quickActions.map(a => (
                <Link key={a.label} href={a.href} className="quick-action-btn">
                  <div className="quick-action-icon">{a.icon}</div>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
