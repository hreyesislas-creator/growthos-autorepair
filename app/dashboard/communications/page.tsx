import { getDashboardTenant } from '@/lib/tenant'
import { getMessageLogs, getMessageTemplates } from '@/lib/queries'
import { createAdminClient } from '@/lib/supabase/server'
import Topbar from '@/components/dashboard/Topbar'

export const metadata = { title: 'Communications' }

// ── Channel badge ──────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: string }) {
  const isEmail = channel === 'email'
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
      background: isEmail ? '#ede9fe' : '#dbeafe',
      color:      isEmail ? '#5b21b6' : '#1e40af',
    }}>
      {channel}
    </span>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  sent:      { bg: '#dcfce7', color: '#14532d', label: 'Sent' },
  delivered: { bg: '#d1fae5', color: '#065f46', label: 'Delivered' },
  pending:   { bg: '#fef3c7', color: '#92400e', label: 'Not Sent (Dev)' },
  failed:    { bg: '#fee2e2', color: '#991b1b', label: 'Failed' },
}
function StatusBadge({ deliveryStatus }: { deliveryStatus: string }) {
  const s = STATUS_STYLES[deliveryStatus] ?? { bg: '#f1f5f9', color: '#475569', label: deliveryStatus }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function CommunicationsPage() {
  const ctx      = await getDashboardTenant()
  const tenantId = ctx?.tenant.id ?? ''

  const [logs, templates] = await Promise.all([
    getMessageLogs(tenantId),
    getMessageTemplates(tenantId),
  ])

  // ── Bulk-resolve customer names ────────────────────────────────────────────
  const customerIds = [...new Set(
    logs.map(l => l.customer_id).filter((id): id is string => !!id),
  )]

  let customerMap = new Map<string, string>()
  if (customerIds.length > 0) {
    const supabase = await createAdminClient()
    const { data } = await supabase
      .from('customers')
      .select('id, first_name, last_name')
      .in('id', customerIds)
    for (const c of data ?? []) {
      customerMap.set(c.id, `${c.first_name} ${c.last_name}`.trim())
    }
  }

  const th: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left',
    fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border-2)',
  }

  return (
    <>
      <Topbar title="Communications" />
      <div className="dash-content">

        {/* ── Message History ─────────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
            Message History
          </div>

          {logs.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>No messages sent yet</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                Messages sent from estimates will appear here.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>Sent</th>
                    <th style={th}>Customer</th>
                    <th style={th}>Channel</th>
                    <th style={th}>To</th>
                    <th style={th}>Message Preview</th>
                    <th style={{ ...th, textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((m, idx) => {
                    const date    = new Date(m.created_at)
                    const isLast  = idx === logs.length - 1
                    const customer = m.customer_id ? customerMap.get(m.customer_id) ?? '—' : '—'
                    const preview = (m.message_body ?? '').replace(/\s+/g, ' ').trim()
                    const previewCapped = preview.length > 80 ? preview.slice(0, 80) + '…' : preview

                    return (
                      <tr
                        key={m.id}
                        style={{ borderBottom: isLast ? 'none' : '1px solid var(--border-2)' }}
                      >
                        {/* Date */}
                        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                            {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Customer */}
                        <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                          {customer}
                        </td>

                        {/* Channel */}
                        <td style={{ padding: '11px 14px' }}>
                          <ChannelBadge channel={m.channel ?? 'sms'} />
                        </td>

                        {/* To address */}
                        <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                          {m.to_phone}
                        </td>

                        {/* Message preview */}
                        <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text-2)', maxWidth: 360 }}>
                          {previewCapped || '—'}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                          <StatusBadge deliveryStatus={m.delivery_status ?? 'sent'} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {logs.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10 }}>
              Showing {logs.length} message{logs.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* ── Message Templates ───────────────────────────────────────────── */}
        {templates.length > 0 && (
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
              Message Templates
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {templates.map(t => (
                <div key={t.id} style={{
                  padding: '10px 14px', borderRadius: 6,
                  border: '1px solid var(--border-2)', background: 'var(--bg-2)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{t.name}</div>
                    <ChannelBadge channel={t.channel ?? 'sms'} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                    {(t.body_en ?? '').slice(0, 100)}{(t.body_en ?? '').length > 100 ? '…' : ''}
                  </div>
                  {t.body_es && (
                    <div style={{ fontSize: 11, color: '#2563eb', marginTop: 3 }}>ES available</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
