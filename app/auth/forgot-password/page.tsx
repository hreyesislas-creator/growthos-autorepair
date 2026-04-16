'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const fieldLabel: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  color: 'rgba(255,255,255,.75)',
  fontSize: '12px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.04em',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: 'rgba(255,255,255,.06)',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  outline: 'none',
}

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const email = String((e.currentTarget.elements.namedItem('email') as HTMLInputElement)?.value ?? '').trim()
    if (!email) {
      setError('Email is required.')
      setPending(false)
      return
    }

    const site = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const supabase = createClient()
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${site}/auth/reset-password`,
    })

    if (resetErr) {
      setError(resetErr.message)
      setPending(false)
      return
    }

    setDone(true)
    setPending(false)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #052543 0%, #0a1a2e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,.4)',
              marginBottom: '10px',
            }}
          >
            GrowthOS
          </div>
          <div
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: '28px',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-.01em',
            }}
          >
            AutoRepair
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: '12px',
            padding: '32px',
            backdropFilter: 'blur(12px)',
          }}
        >
          <h1
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '20px',
              fontWeight: 600,
              color: '#fff',
              marginBottom: '6px',
            }}
          >
            Forgot password
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.45)', marginBottom: '28px' }}>
            Enter your email and we&apos;ll send a reset link if the account exists.
          </p>

          {done ? (
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.75)', lineHeight: 1.5 }}>
              If that email exists, a reset link has been sent.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label htmlFor="email" style={fieldLabel}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  style={inputStyle}
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
                {pending ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: '20px', marginBottom: 0 }}>
            <Link href="/auth/login" style={{ color: 'rgba(255,255,255,.55)', fontSize: '13px' }}>
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
