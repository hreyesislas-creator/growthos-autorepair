'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function ResetPasswordPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const formData = new FormData(e.currentTarget)
    const password = String(formData.get('password') ?? '')
    const confirm = String(formData.get('confirm') ?? '')

    if (password !== confirm) {
      setError('Passwords do not match.')
      setPending(false)
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setPending(false)
      return
    }

    const supabase = createClient()
    const { error: updateErr } = await supabase.auth.updateUser({ password })

    if (updateErr) {
      setError(updateErr.message)
      setPending(false)
      return
    }

    router.replace('/auth/login?reset=success')
    router.refresh()
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
            Reset your password
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.45)', marginBottom: '28px' }}>
            Enter a new password for your account.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="password" style={fieldLabel}>
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="confirm" style={fieldLabel}>
                Confirm password
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                required
                autoComplete="new-password"
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
              {pending ? 'Saving…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
