'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const destination  = searchParams.get('redirect') || '/dashboard'

  const [error,   setError]   = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email    = String(formData.get('email')    ?? '').trim()
    const password = String(formData.get('password') ?? '')

    console.log('[LoginForm] submit | email:', email, '| destination:', destination)

    const supabase = createClient()

    // ── 1. Sign in ───────────────────────────────────────────────────────────
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    console.log(
      '[LoginForm] signInWithPassword |',
      'error:', signInError?.message ?? 'none',
      '| session:', data?.session ? 'EXISTS' : 'NULL',
      '| user:', data?.user?.id ?? 'null',
    )

    if (signInError) {
      setError(signInError.message)
      setPending(false)
      return
    }

    // ── 1b. Verify session was created ───────────────────────────────────────
    if (!data.session) {
      console.error('[LoginForm] signInWithPassword succeeded but returned no session', { data })
      setError('Sign in failed: no session created. Please try again.')
      setPending(false)
      return
    }

    // ── 2. Confirm getSession() can read the session back ────────────────────
    const { data: { session: storedSession } } = await supabase.auth.getSession()
    console.log('[LoginForm] getSession() after sign-in:', storedSession ? 'EXISTS' : 'NULL')

    // ── 3. Poll document.cookie for sb- entries (max 2 s, 50 ms intervals) ──
    //    Our custom cookies adapter in lib/supabase/client.ts writes
    //    document.cookie synchronously inside signInWithPassword, so this
    //    loop should succeed on the very first tick. It exists as a safety
    //    net and to produce hard diagnostic evidence in the console.
    let sbCookies: string[] = []
    const deadline = Date.now() + 2000

    while (Date.now() < deadline) {
      sbCookies = document.cookie.split('; ').filter(c => c.startsWith('sb-'))
      if (sbCookies.length > 0) break
      await new Promise<void>(r => setTimeout(r, 50))
    }

    console.log(
      '[LoginForm] sb- cookies before navigate:',
      sbCookies.length,
      sbCookies,
    )

    if (sbCookies.length === 0) {
      console.warn(
        '[LoginForm] WARNING — no sb- cookies found after 2 s.',
        'Full document.cookie:', document.cookie || '(empty)',
      )
    }

    // ── 4. Navigate — cookies are in document.cookie → middleware can read them
    console.log('[LoginForm] navigating to:', destination)
    window.location.assign(destination)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '14px' }}>
        <label
          htmlFor="email"
          style={{
            display: 'block',
            marginBottom: '6px',
            color: 'rgba(255,255,255,.75)',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.04em',
          }}
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@yourbusiness.com"
          style={{
            width: '100%',
            padding: '11px 14px',
            background: 'rgba(255,255,255,.06)',
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label
          htmlFor="password"
          style={{
            display: 'block',
            marginBottom: '6px',
            color: 'rgba(255,255,255,.75)',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.04em',
          }}
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder="••••••••"
          style={{
            width: '100%',
            padding: '11px 14px',
            background: 'rgba(255,255,255,.06)',
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
          }}
        />
      </div>

      {error && (
        <div
          style={{
            marginBottom: '14px',
            padding: '10px 12px',
            borderRadius: '6px',
            background: 'rgba(255, 80, 80, 0.12)',
            border: '1px solid rgba(255, 80, 80, 0.25)',
            color: '#ffb3b3',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        style={{
          width: '100%',
          padding: '13px',
          background: '#0070c9',
          border: 'none',
          borderRadius: '6px',
          color: '#fff',
          fontSize: '15px',
          fontWeight: 600,
          cursor: pending ? 'not-allowed' : 'pointer',
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? 'Signing In...' : 'Sign In'}
      </button>
    </form>
  )
}
