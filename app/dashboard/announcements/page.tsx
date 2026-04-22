import { getDashboardTenant } from '@/lib/tenant'
import { getShopAnnouncementsForTenant } from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import { createShopAnnouncement, deleteShopAnnouncement } from './actions'
import { format, parseISO } from 'date-fns'

export const metadata = { title: 'Shop announcements' }

export default async function ShopAnnouncementsPage() {
  const ctx = await getDashboardTenant()
  const tenantId = ctx?.tenant.id ?? ''
  const rows = tenantId ? await getShopAnnouncementsForTenant(tenantId, 50) : []

  return (
    <>
      <Topbar
        title="Shop announcements"
        subtitle="Visible to technicians on their dashboard — internal only."
      />
      <div className="dash-content">
        <div className="card" style={{ padding: 16, marginBottom: 20, maxWidth: 560 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 10 }}>
            New announcement
          </div>
          <form action={createShopAnnouncement}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>
              Title
            </label>
            <input
              name="title"
              required
              maxLength={200}
              className="field-input"
              style={{ width: '100%', marginBottom: 12 }}
              placeholder="e.g. Shop closed Saturday"
            />
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>
              Message
            </label>
            <textarea
              name="message"
              required
              maxLength={4000}
              rows={4}
              className="field-input"
              style={{ width: '100%', marginBottom: 12, resize: 'vertical' }}
              placeholder="Plain text only — no links required."
            />
            <button type="submit" className="btn-primary">
              Post
            </button>
          </form>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 10 }}>
          RECENT ({rows.length})
        </div>
        {rows.length === 0 ? (
          <div className="card" style={{ padding: 24, color: 'var(--text-3)' }}>
            No announcements yet. Post one above — technicians will see it on their overview.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map(a => (
              <li key={a.id} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{a.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8, whiteSpace: 'pre-wrap' }}>
                      {a.message}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-3)',
                        marginTop: 10,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {format(parseISO(a.created_at), 'MMM d, yyyy · h:mm a')}
                    </div>
                  </div>
                  <form action={deleteShopAnnouncement.bind(null, a.id)}>
                    <button
                      type="submit"
                      className="btn-ghost"
                      style={{ fontSize: 11, color: '#b91c1c' }}
                      aria-label="Delete announcement"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
