import { getDashboardTenant } from '@/lib/tenant'
import { getCallsForTenant } from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import { format } from 'date-fns'

export const metadata = { title: 'Call Logs' }

export default async function CallsPage() {
  const ctx = await getDashboardTenant()
  if (!ctx) return null

  const tenantId = ctx.tenant.id
  const calls = await getCallsForTenant(tenantId)

  const dispositionColors: Record<string, { bg: string; text: string }> = {
    answered: { bg: '#dcfce7', text: '#14532d' },
    missed: { bg: '#fee2e2', text: '#7f1d1d' },
    failed: { bg: '#fecaca', text: '#7f1d1d' },
    null: { bg: '#e2e8f0', text: '#1e293b' },
  }

  const getDispositionColor = (disposition: string | null) => {
    if (!disposition) return dispositionColors['null']
    return dispositionColors[disposition] || { bg: '#e2e8f0', text: '#1e293b' }
  }

  const formatPhoneNumber = (number: string | null) => {
    if (!number) return '—'
    // Simple formatting for E.164 numbers: +14155552671 → +1 (415) 555-2671
    const match = number.match(/^\+?1?(\d{3})(\d{3})(\d{4})$/)
    if (match) {
      return `+1 (${match[1]}) ${match[2]}-${match[3]}`
    }
    return number
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds || seconds === 0) return '—'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}m ${secs}s`
    }
    return `${secs}s`
  }

  return (
    <>
      <Topbar title="Call Logs" />
      <div className="dash-content">
        <div className="table-wrap">
          {calls.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">☎️</div>
              <div className="empty-state-title">No calls yet</div>
              <div className="empty-state-body">Incoming calls will be logged here.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Disposition</th>
                  <th>SMS Sent</th>
                </tr>
              </thead>
              <tbody>
                {calls.map(call => {
                  const dispositionColor = getDispositionColor(call.disposition)
                  const callDate = new Date(call.initiated_at)
                  const formattedDate = format(callDate, 'MMM d, yyyy')
                  const formattedTime = format(callDate, 'h:mm a')

                  return (
                    <tr key={call.id}>
                      <td style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                        <div>{formattedDate}</div>
                        <div style={{ fontSize: '11px' }}>{formattedTime}</div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {formatPhoneNumber(call.from_number)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {formatPhoneNumber(call.to_number)}
                      </td>
                      <td style={{ fontSize: '12px', textTransform: 'capitalize' }}>
                        {call.call_status || '—'}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                        {formatDuration(call.call_duration_seconds)}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '11px',
                            fontWeight: 500,
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: dispositionColor.bg,
                            color: dispositionColor.text,
                            textTransform: 'capitalize',
                            minWidth: '60px',
                            textAlign: 'center',
                          }}
                        >
                          {call.disposition || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {call.missed_call_sms_sent ? '✓' : '—'}
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
