import { getDashboardTenant } from '@/lib/tenant'
import Topbar from '@/components/dashboard/Topbar'
import { BusinessProfileForm, WebsiteModulesForm } from './SettingsClient'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const ctx      = await getDashboardTenant()
  const profile  = ctx?.profile  ?? null
  const settings = ctx?.settings ?? null

  return (
    <>
      <Topbar title="Settings" />
      <div className="dash-content">
        <div className="two-col">

          <BusinessProfileForm profile={profile} />

          <div>
            <WebsiteModulesForm settings={settings} />

            <div className="card">
              <div className="section-title" style={{ marginBottom: '12px' }}>Dashboard Language</div>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '12px' }}>
                Switch the dashboard UI between English and Spanish using the toggle in the sidebar.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge badge-blue">EN — English (default)</span>
                <span className="badge badge-gray">ES — Español</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
