'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { Lang, TranslationKey } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import type { AppRole } from '@/lib/auth/role-access'
import {
  appModuleForDashboardNavHref,
  canAccessModule,
  canManageShopAnnouncements,
} from '@/lib/auth/role-access'

/** Primary day-to-day hub links (always visible). */
const NAV_PRIMARY = [
  { href: '/dashboard', icon: '▦', key: 'nav_overview' as const },
  { href: '/dashboard/vehicles', icon: '🚗', key: 'nav_vehicles' as const },
  { href: '/dashboard/customers', icon: '👥', key: 'nav_customers' as const },
  { href: '/dashboard/appointments', icon: '📅', key: 'nav_appointments' as const },
  { href: '/dashboard/communications', icon: '💬', key: 'nav_communications' as const },
] as const

/** Shop workflow + catalogs — collapsible “Work” group (routes unchanged). */
const NAV_WORK = [
  { href: '/dashboard/inspections', icon: '🔍', key: 'nav_inspections' as const },
  { href: '/dashboard/estimates', icon: '📋', key: 'nav_estimates' as const },
  { href: '/dashboard/work-orders', icon: '🔧', key: 'nav_work_orders' as const },
  { href: '/dashboard/invoices', icon: '🧾', key: 'nav_invoices' as const },
  { href: '/dashboard/services', icon: '\u{1F4C4}', key: 'nav_job_templates' as const },
  { href: '/dashboard/parts', icon: '\u{1F4E6}', key: 'nav_parts' as const },
] as const

const NAV_MANAGE = [
  { href: '/dashboard/website', icon: '🌐', key: 'nav_website' as const },
  { href: '/dashboard/reviews', icon: '⭐', key: 'nav_reviews' as const },
  { href: '/dashboard/financials', icon: '\u{1F4CA}', key: 'nav_financials' as const },
  { href: '/dashboard/billing', icon: '💳', key: 'nav_billing' as const },
  { href: '/dashboard/team', icon: '🔑', key: 'nav_team' as const },
  { href: '/dashboard/settings', icon: '⚙️', key: 'nav_settings' as const },
] as const

interface SidebarProps {
  tenantName: string
  tenantPlan: string
  initialLang: Lang
  appRole: AppRole
}

export default function Sidebar({ tenantName, tenantPlan, initialLang, appRole }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [lang, setLang] = useState<Lang>(initialLang)
  const [workOpen, setWorkOpen] = useState(true)

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const handleLang = (l: Lang) => {
    setLang(l)
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_lang', l)
    }
  }

  const navAllowed = (href: string) => {
    if (href === '/dashboard/announcements') return canManageShopAnnouncements(appRole)
    const m = appModuleForDashboardNavHref(href)
    return m != null && canAccessModule(appRole, m)
  }

  const primaryNav = NAV_PRIMARY.filter(({ href }) => navAllowed(href))
  const workNav = NAV_WORK.filter(({ href }) => navAllowed(href))
  const manageNav = NAV_MANAGE.filter(({ href }) => navAllowed(href))

  const workGroupHasActive = workNav.some(({ href }) => isActive(href))

  useEffect(() => {
    if (workGroupHasActive) setWorkOpen(true)
  }, [workGroupHasActive, pathname])

  return (
    <aside className="dash-sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-brand">GrowthOS</div>
        <div className="sidebar-logo-name">AutoRepair</div>
      </div>

      <div className="sidebar-tenant">
        <div className="sidebar-tenant-name">{tenantName}</div>
        <div className="sidebar-tenant-plan">{tenantPlan}</div>
      </div>

      <nav className="sidebar-nav" aria-label="Dashboard navigation">
        {primaryNav.map(({ href, icon, key }) => (
          <Link
            key={href}
            href={href}
            className={`sidebar-link${isActive(href) ? ' active' : ''}`}
          >
            <span style={{ fontSize: '15px', lineHeight: 1 }}>{icon}</span>
            {t(lang, key as TranslationKey)}
          </Link>
        ))}

        {workNav.length > 0 && (
          <>
            <div style={{ marginTop: 8, padding: '8px 14px 4px' }}>
              <button
                type="button"
                className={`sidebar-group-toggle${workGroupHasActive ? ' has-active-route' : ''}`}
                onClick={() => setWorkOpen(o => !o)}
                aria-expanded={workOpen}
              >
                <span>{t(lang, 'nav_section_work')}</span>
                <span className="sidebar-group-chevron" aria-hidden>
                  {workOpen ? '▼' : '▶'}
                </span>
              </button>
            </div>
            {workOpen && (
              <div className="sidebar-group-items">
                {workNav.map(({ href, icon, key }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`sidebar-link${isActive(href) ? ' active' : ''}`}
                  >
                    <span style={{ fontSize: '15px', lineHeight: 1 }}>{icon}</span>
                    {t(lang, key as TranslationKey)}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {manageNav.length > 0 && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: '8px' }}>Manage</div>
            {manageNav.map(({ href, icon, key }) => (
              <Link
                key={href}
                href={href}
                className={`sidebar-link${isActive(href) ? ' active' : ''}`}
              >
                <span style={{ fontSize: '15px', lineHeight: 1 }}>{icon}</span>
                {t(lang, key as TranslationKey)}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-bottom">
        <div className="lang-switcher">
          <button
            className={`lang-btn${lang === 'en' ? ' active' : ''}`}
            onClick={() => handleLang('en')}
            aria-pressed={lang === 'en'}
          >EN</button>
          <button
            className={`lang-btn${lang === 'es' ? ' active' : ''}`}
            onClick={() => handleLang('es')}
            aria-pressed={lang === 'es'}
          >ES</button>
        </div>
        <button className="signout-btn" onClick={handleSignOut}>
          <span>↩</span> {t(lang, 'common_sign_out')}
        </button>
      </div>
    </aside>
  )
}
