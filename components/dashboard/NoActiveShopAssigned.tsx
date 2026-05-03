'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Shown when the user is signed in but has no active tenant_users mapping.
 * Sign out clears the session so /auth/login is usable (middleware no longer bounces to /dashboard).
 */
export default function NoActiveShopAssigned() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleSignOut() {
    setBusy(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div
      className="dash-content"
      style={{
        maxWidth: '32rem',
        margin: '0 auto',
        padding: 'clamp(24px, 4vw, 48px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'center',
        minHeight: '70vh',
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r12)',
          padding: '28px 24px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.35rem',
            fontWeight: 800,
            color: 'var(--navy)',
            marginBottom: '12px',
            lineHeight: 1.25,
          }}
        >
          No active shop assigned
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: '15px', marginBottom: '24px' }}>
          Your account is not assigned to an active shop yet. Please contact your administrator.
        </p>
        <button
          type="button"
          disabled={busy}
          className="btn-primary"
          onClick={() => void handleSignOut()}
          style={{ width: '100%' }}
        >
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}
