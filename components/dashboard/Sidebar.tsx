'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import type { AppRole } from '@/lib/auth/role-access'
import { appModuleForDashboardNavHref, canAccessModule } from '@/lib/auth/role-access'

const NAV = [
  { href: '/dashboard',               icon: '▦',  key: 'nav_overview'       },
  { href: '/dashboard/appointments',  icon: '📅', key: 'nav_appointments'   },
  { href: '/dashboard/customers',     icon: '👥', key: 'nav_customers'      },
  { href: '/dashboard/vehicles',      icon: '🚗', key: 'nav_vehicles'       },
  { href: '/dashboard/inspections',   icon: '🔍', key: 'nav_inspections'    },
  { href: '/dashboard/estimates',     icon: '📋', key: 'nav_estimates'      },
  { href: '/dashboard/services',      icon: '\u{1F4C4}', key: 'nav_job_templates' },
  { href: '/dashboard/parts',         icon: '\u{1F4E6}', key: 'nav_parts' },
  { href: '/dashboard/work-orders',   icon: '🔧', key: 'nav_work_orders'    },
  { href: '/dashboard/invoices',      icon: '🧾', key: 'nav_invoices'       },
  { href: '/dashboard/communications',icon: '💬', key: 'nav_communications' },
] as const

const NAV2 = [
  { href: '/dashboard/website',       icon: '🌐', key: 'nav_website'   },
  { href: '/dashboard/reviews',       icon: '⭐', key: 'nav_reviews'   },
  { href: '/dashboard/financials',   icon: '\u{1F4CA}', key: 'nav_financials' },
  { href: '/dashboard/billing',       icon: '💳', key: 'nav_billing'   },
  { href: '/dashboard/team',          icon: '🔑', key: 'nav_team'      },
  { href: '/dashboard/settings',      icon: '⚙️', key: 'nav_settings'  },
] as const

type NavKey = typeof NAV[number]['key'] | typeof NAV2[number]['key']

interface SidebarProps {
  tenantName: string
  tenantPlan: string
  initialLang: Lang
  appRole: AppRole
}

export default function Sidebar({ tenantName, tenantPlan, initialLang, appRole }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const [lang, setLang] = useState<Lang>(initialLang)

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
    // Persist to localStorage for now; server-side persistence done via settings page
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_lang', l)
    }
  }

  const navAllowed = (href: string) => {
    const m = appModuleForDashboardNavHref(href)
    return m != null && canAccessModule(appRole, m)
  }
  const operationsNav = NAV.filter(({ href }) => navAllowed(href))
  const manageNav = NAV2.filter(({ href }) => navAllowed(href))

  return (
    <aside className="dash-sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-brand">GrowthOS</div>
        <div className="sidebar-logo-name">AutoRepair</div>
      </div>

      {/* Tenant pill */}
      <div className="sidebar-tenant">
        <div className="sidebar-tenant-name">{tenantName}</div>
        <div className="sidebar-tenant-plan">{tenantPlan}</div>
      </div>

      {/* Primary nav */}
      <nav className="sidebar-nav" aria-label="Dashboard navigation">
        <div className="sidebar-section-label">Operations</div>
        {operationsNav.map(({ href, icon, key }) => (
          <Link
            key={href}
            href={href}
            className={`sidebar-link${isActive(href) ? ' active' : ''}`}
          >
            <span style={{ fontSize: '15px', lineHeight: 1 }}>{icon}</span>
            {t(lang, key as NavKey)}
          </Link>
        ))}

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
                {t(lang, key as NavKey)}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Bottom: lang switcher + sign out */}
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
