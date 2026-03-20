import Topbar from "@/components/dashboard/Topbar"

export const metadata = { title: "Admin Settings" }

export default function AdminSettingsPage() {
  return (
    <>
      <Topbar title="Admin Settings" />
      <div className="dash-content">
        <div className="card" style={{ maxWidth: "480px" }}>
          <div className="section-title" style={{ marginBottom: "14px" }}>Platform Configuration</div>
          <p style={{ fontSize: "13px", color: "var(--text-3)", marginBottom: "20px" }}>
            Global platform settings for GrowthOS AutoRepair. Stage 1 — shell in place.
          </p>
          {[
            "Default onboarding plan",
            "Trial duration (days)",
            "Platform support email",
            "Webhook endpoint URL",
          ].map(label => (
            <div key={label} className="form-group" style={{ marginBottom: "12px" }}>
              <label className="field-label">{label}</label>
              <input className="field-input" placeholder={label} readOnly />
            </div>
          ))}
          <button className="btn-primary" style={{ marginTop: "8px" }}>Save Settings</button>
        </div>
      </div>
    </>
  )
}
