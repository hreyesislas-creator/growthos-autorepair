import type { Metadata } from 'next'
import { Suspense } from 'react'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Sign In — GrowthOS AutoRepair',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #052543 0%, #0a1a2e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '24px',
    }}>
     

      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,.4)',
            marginBottom: '10px',
          }}>GrowthOS</div>
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: '28px',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-.01em',
          }}>AutoRepair</div>
          <div style={{
            width: '32px',
            height: '2px',
            background: '#0070C9',
            margin: '12px auto 0',
            borderRadius: '1px',
          }} />
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,.04)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: '12px',
          padding: '32px',
          backdropFilter: 'blur(12px)',
        }}>
          <h1 style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '20px',
            fontWeight: 600,
            color: '#fff',
            marginBottom: '6px',
          }}>Sign in to your dashboard</h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.45)', marginBottom: '28px' }}>
            Enter your credentials to continue
          </p>

          <Suspense fallback={<div>Loading...</div>}>
  <LoginForm />
</Suspense>
        </div>

        <p style={{
          textAlign: 'center',
          fontSize: '12px',
          color: 'rgba(255,255,255,.25)',
          marginTop: '24px',
        }}>
          GrowthOS AutoRepair — Powered by E&E Tires Platform
        </p>
      </div>
    </div>
  )
}
