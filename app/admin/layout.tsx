import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import '../dashboard/dashboard.css'

export const metadata: Metadata = {
  title: { default: 'GrowthOS Admin', template: '%s — GrowthOS Admin' },
  robots: { index: false, follow: false },
}

const ADMIN_NAV = [
  { href: '/admin',           label: 'Overview',        icon: '▦'  },
  { href: '/admin/clients',   label: 'Clients',         icon: '🏢' },
  { href: '/admin/billing',   label: 'Billing',         icon: '💳' },
  { href: '/admin/tenants',   label: 'Tenants',         icon: '🏗️' },
  { href: '/admin/support',   label: 'Support',         icon: '🎫' },
  { href: '/admin/settings',  label: 'Admin Settings',  icon: '⚙️' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/admin')

  // TODO: add role check for master admin — for now any authenticated user can see admin shell

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="dash-shell">
          <aside className="dash-sidebar">
            <div className="sidebar-logo">
              <div className="sidebar-logo-brand">GrowthOS</div>
              <div className="sidebar-logo-name" style={{ fontSize: '16px' }}>Master Admin</div>
            </div>

            <div className="sidebar-tenant" style={{ background: 'rgba(239,68,68,.1)', borderColor: 'rgba(239,68,68,.25)' }}>
              <div className="sidebar-tenant-name" style={{ color: '#fca5a5' }}>Internal Admin</div>
              <div className="sidebar-tenant-plan" style={{ color: '#f87171' }}>Platform Control</div>
            </div>

            <nav className="sidebar-nav">
              {ADMIN_NAV.map(n => (
                <Link key={n.href} href={n.href} className="sidebar-link">
                  <span style={{ fontSize: '15px' }}>{n.icon}</span>
                  {n.label}
                </Link>
              ))}
            </nav>

            <div className="sidebar-bottom">
              <Link href="/dashboard" className="btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '12px', marginBottom: '8px' }}>
                ← Back to Dashboard
              </Link>
            </div>
          </aside>

          <main className="dash-main">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
