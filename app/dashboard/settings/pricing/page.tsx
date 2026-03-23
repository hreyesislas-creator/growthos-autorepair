import { getDashboardTenant } from '@/lib/tenant'
import { getTenantPricingConfig } from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import PricingConfigForm from './PricingConfigForm'

export const metadata = { title: 'Pricing Settings' }

export default async function PricingSettingsPage() {
  const ctx = await getDashboardTenant()
  const tenantId = ctx?.tenant.id ?? ''

  const config = tenantId ? await getTenantPricingConfig(tenantId) : null

  return (
    <>
      <Topbar
        title="Pricing &amp; Tax"
        subtitle="Default rates applied to new estimates"
        action={{ label: '← Settings', href: '/dashboard/settings' }}
      />
      <div className="dash-content">
        <div style={{ maxWidth: 640 }}>
          <PricingConfigForm config={config} />
        </div>
      </div>
    </>
  )
}
