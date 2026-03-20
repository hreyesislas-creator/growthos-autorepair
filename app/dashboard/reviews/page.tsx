import { getDashboardTenant } from '@/lib/tenant'
import { getReviews } from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'

export const metadata = { title: 'Reviews' }

export default async function ReviewsPage() {
  const ctx      = await getDashboardTenant()
  const tenantId = ctx?.tenant.id ?? ''
  const reviews  = await getReviews(tenantId)

  const avg = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <>
      <Topbar title="Reviews" />
      <div className="dash-content">
        {avg && (
          <div className="kpi-grid" style={{ marginBottom: "20px" }}>
            <div className="kpi-card">
              <div className="kpi-label">Average Rating</div>
              <div className="kpi-value" style={{ color: "#f59e0b" }}>{avg}★</div>
              <div className="kpi-sub">{reviews.length} Google reviews</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">5-Star Reviews</div>
              <div className="kpi-value">{reviews.filter(r => r.rating === 5).length}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Featured</div>
              <div className="kpi-value">{reviews.filter(r => r.is_featured).length}</div>
            </div>
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">⭐</div>
              <div className="empty-state-title">No reviews yet</div>
              <div className="empty-state-body">Google reviews will appear here once connected.</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px" }}>
            {reviews.map(r => (
              <div key={r.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "14px" }}>{r.reviewer_name}</div>
                  <div>
                    {"★".repeat(r.rating)}<span style={{ color: "var(--text-3)" }}>{"★".repeat(5 - r.rating)}</span>
                    {r.is_featured && <span className="badge badge-blue" style={{ marginLeft: "6px" }}>Featured</span>}
                  </div>
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: "1.6", margin: 0 }}>
                  {r.text ?? "No review text"}
                </p>
                <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "10px" }}>
                  {r.platform} · {r.review_date ?? ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
