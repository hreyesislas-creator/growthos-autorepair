import { getDashboardTenant } from '@/lib/tenant'
import { getTenantPricingConfig } from '@/lib/queries'
import { canEditDashboardModule } from '@/lib/auth/roles'
import Topbar from '@/components/dashboard/Topbar'
import Link from 'next/link'
import { BusinessProfileForm, WebsiteModulesForm } from './SettingsClient'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const ctx      = await getDashboardTenant()
  const profile  = ctx?.profile  ?? null
  const settings = ctx?.settings ?? null
  const pricing  = ctx?.tenant.id ? await getTenantPricingConfig(ctx.tenant.id) : null

  const [canEditSettings, canEditWebsite] = await Promise.all([
    canEditDashboardModule('settings'),
    canEditDashboardModule('website'),
  ])

  const taxDisplay = pricing?.default_tax_rate != null
    ? `${parseFloat((Number(pricing.default_tax_rate) * 100).toFixed(4))}%`
    : 'Not configured'

  return (
    <>
      <Topbar title="Settings" />
      <div className="dash-content">
        <div className="two-col">

          <BusinessProfileForm profile={profile} readOnly={!canEditSettings} />

          <div>
            <WebsiteModulesForm settings={settings} readOnly={!canEditWebsite} />

            {/* Pricing & Tax link card */}
            <div className="card" style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div className="section-title" style={{ marginBottom: 4 }}>Pricing &amp; Tax</div>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
                    Default tax rate:{' '}
                    <strong style={{ color: pricing?.default_tax_rate != null ? 'var(--text)' : 'var(--text-3)' }}>
                      {taxDisplay}
                    </strong>
                  </p>
                </div>
                {canEditSettings ? (
                  <Link
                    href="/dashboard/settings/pricing"
                    className="btn-ghost"
                    style={{ fontSize: 12, whiteSpace: 'nowrap' }}
                  >
                    Configure →
                  </Link>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>View only</span>
                )}
              </div>
            </div>

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
