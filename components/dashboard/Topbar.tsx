import Link from 'next/link'

interface TopbarProps {
  title: string
  subtitle?: string
  action?: { label: string; href?: string; onClick?: string }
}

export default function Topbar({ title, subtitle, action }: TopbarProps) {
  return (
    <header className="dash-topbar">
      <div>
        <span className="topbar-title">{title}</span>
        {subtitle && <span className="topbar-sub">&nbsp;· {subtitle}</span>}
      </div>
      <div className="topbar-right">
        {action?.href && (
          <Link href={action.href} className="btn-primary">
            + {action.label}
          </Link>
        )}
      </div>
    </header>
  )
}
