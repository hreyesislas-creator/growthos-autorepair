import Link from 'next/link'

interface TopbarProps {
  title: string
  subtitle?: string
  action?: { label: string; href?: string; onClick?: string }
  /** Compact ghost links (e.g. dashboard header shortcuts) */
  quickLinks?: { label: string; href: string }[]
}

export default function Topbar({ title, subtitle, action, quickLinks }: TopbarProps) {
  return (
    <header className="dash-topbar">
      <div className="topbar-heading">
        <span className="topbar-title">{title}</span>
        {subtitle && <span className="topbar-sub">&nbsp;· {subtitle}</span>}
      </div>
      <div className="topbar-right">
        {quickLinks && quickLinks.length > 0 && (
          <nav className="topbar-quick-actions" aria-label="Quick actions">
            {quickLinks.map(q => (
              <Link key={`${q.href}-${q.label}`} href={q.href} className="topbar-quick-btn">
                {q.label}
              </Link>
            ))}
          </nav>
        )}
        {action?.href && (
          <Link href={action.href} className="btn-primary">
            + {action.label}
          </Link>
        )}
      </div>
    </header>
  )
}
