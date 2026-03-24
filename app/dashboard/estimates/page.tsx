import { getDashboardTenant } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/dashboard/Topbar'
import StatusBadge from '@/components/dashboard/StatusBadge'
import Link from 'next/link'
import { format } from 'date-fns'

export const metadata = { title: 'Estimates' }

// ── Status badge colours ───────────────────────────────────────────────────────

function EstimateStatusBadge({ status }: { status: string }) {
  const MAP: Record<string, { bg: string; color: string; label: string }> = {
    draft:    { bg: '#f1f5f9', color: '#475569', label: 'Draft'    },
    sent:     { bg: '#eff6ff', color: '#1d4ed8', label: 'Sent'     },
    approved: { bg: '#f0fdf4', color: '#15803d', label: 'Approved' },
    declined: { bg: '#fff7ed', color: '#c2410c', label: 'Declined' },
  }
  const s = MAP[status] ?? { bg: '#f1f5f9', color: '#64748b', label: status }
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px',
      borderRadius: 6, background: s.bg, color: s.color,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

function CreationModeBadge({ mode }: { mode: string }) {
  if (mode === 'manual_entry') return null
  const MAP: Record<string, string> = {
    pdf_import:       'PDF Import',
    system_generated: 'System',
  }
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '1px 6px',
      borderRadius: 4, background: 'var(--surface-3,#f1f5f9)',
      color: 'var(--text-3)', textTransform: 'capitalize',
    }}>
      {MAP[mode] ?? mode}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type CustomerRef = { first_name: string; last_name: string }
type VehicleRef  = { year: number | null; make: string | null; model: string | null }

// Supabase returns joined rows as arrays when using object-relation select
type EstimateRow = {
  id: string
  estimate_number: string
  status: string
  creation_mode: string
  total: number
  updated_at: string
  customer: CustomerRef | CustomerRef[] | null
  vehicle:  VehicleRef  | VehicleRef[]  | null
}

export default async function EstimatesPage() {
  const ctx = await getDashboardTenant()
  const tenantId = ctx?.tenant.id ?? ''

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('estimates')
    .select(`
      id,
      estimate_number,
      status,
      creation_mode,
      total,
      updated_at,
      customer:customers(first_name, last_name),
      vehicle:vehicles(year, make, model)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[EstimatesPage]', error.message)
  }

  const estimates = (data ?? []) as unknown as EstimateRow[]

  return (
    <>
      <Topbar title="Estimates" />
      <div className="dash-content">
        <div className="table-wrap">
          {estimates.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No estimates yet</div>
              <div className="empty-state-body">
                Open an inspection and click <strong>Create Estimate</strong> to get started.
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Estimate #</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Total</th>
                  <th>Last Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {estimates.map(est => {
                  const customer = Array.isArray(est.customer) ? est.customer[0] : est.customer
                  const vehicle  = Array.isArray(est.vehicle)  ? est.vehicle[0]  : est.vehicle

                  const customerName = customer
                    ? `${customer.first_name} ${customer.last_name}`.trim()
                    : '—'

                  const vehicleLabel = vehicle
                    ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')
                    : '—'

                  return (
                    <tr key={est.id}>
                      <td style={{
                        fontFamily: 'var(--font-mono)', fontSize: 13,
                        fontWeight: 600, color: 'var(--text)',
                      }}>
                        {est.estimate_number}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text)' }}>
                        {customerName}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {vehicleLabel}
                      </td>
                      <td>
                        <EstimateStatusBadge status={est.status} />
                      </td>
                      <td>
                        <CreationModeBadge mode={est.creation_mode} />
                      </td>
                      <td style={{
                        fontFamily: 'var(--font-mono)', fontSize: 13,
                        fontWeight: 600, color: 'var(--text)', textAlign: 'right',
                      }}>
                        ${Number(est.total).toFixed(2)}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {format(new Date(est.updated_at), 'MMM d, yyyy')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <Link
                            href={`/dashboard/estimates/${est.id}`}
                            className="btn-ghost"
                            style={{ padding: '3px 10px', fontSize: '12px' }}
                          >
                            View
                          </Link>
                          <Link
                            href={`/dashboard/estimates/${est.id}/present`}
                            className="btn-ghost"
                            style={{ padding: '3px 10px', fontSize: '12px', color: 'var(--text-3)' }}
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
    </>
  )
}
