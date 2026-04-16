import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardTenant } from '@/lib/tenant'
import { getCurrentAppRoleForTenant } from '@/lib/auth/roles'
import Sidebar from '@/components/dashboard/Sidebar'
import './dashboard.css'

export const metadata: Metadata = {
  title: { default: 'Dashboard — GrowthOS AutoRepair', template: '%s — GrowthOS' },
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  console.log(
    '[dashboard layout] AUTH CHECK:',
    'user:', user?.id ?? 'null',
    '| email:', user?.email ?? 'null'
  )

  if (!user) {
    console.log('[dashboard layout] REDIRECT: no user found → /auth/login')
    redirect('/auth/login')
  }

  const ctx = await getDashboardTenant()

  console.log('[dashboard layout] ctx:', ctx ? `tenant=${ctx.tenant.slug}` : 'null')

  if (!ctx) {
    console.log('[dashboard layout] no ctx — redirecting to /auth/login')
    redirect('/auth/login')
  }

  const tenantName = ctx!.profile?.business_name ?? ctx!.tenant.name ?? 'Your Shop'
  const tenantPlan = ctx!.tenant.plan ?? 'trial'

  const { data: tuData } = await supabase
    .from('tenant_users')
    .select('preferred_language')
    .eq('auth_user_id', user!.id)
    .single()

  const lang: 'en' | 'es' = (tuData?.preferred_language as 'en' | 'es') ?? 'en'
  const appRole = await getCurrentAppRoleForTenant()

  console.log('[dashboard layout] rendering — tenant:', tenantName, '| lang:', lang)

  // Nested layouts must NOT render <html>, <head>, or <body>.
  // Font links live in app/layout.tsx. The lang value is passed to Sidebar
  // for UI-level language switching; it cannot change the root <html lang>.
  return (
    <div className="dash-shell">
      <Sidebar
        tenantName={tenantName}
        tenantPlan={tenantPlan}
        initialLang={lang}
        appRole={appRole}
      />
      <main className="dash-main">
        {children}
      </main>
    </div>
  )
}
