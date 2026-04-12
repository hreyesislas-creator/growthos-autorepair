'use client'

import { useState } from 'react'

interface FinalAuthorizationBlockProps {
  approvedItemsCount:  number
  declinedItemsCount?: number
  pendingItemsCount?:  number
  approvedTotal?:      number
  workOrderId?:        string
  onAuthorize:         (customerName: string | null) => Promise<string | void>
  onViewWorkOrder?:    (workOrderId: string) => void
  isReopening?:        boolean
}

export default function FinalAuthorizationBlock({
  approvedItemsCount,
  declinedItemsCount = 0,
  pendingItemsCount  = 0,
  approvedTotal,
  workOrderId,
  onAuthorize,
  onViewWorkOrder,
  isReopening,
}: FinalAuthorizationBlockProps) {
  const [checked, setChecked] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authorizationComplete, setAuthorizationComplete] = useState(false)

  const canAuthorize = approvedItemsCount > 0 && checked && !isLoading

  const handleAuthorize = async () => {
    setError(null)
    setIsLoading(true)
    setAuthorizationComplete(false)

    try {
      const resultWorkOrderId = await onAuthorize(customerName || null)
      setAuthorizationComplete(true)
      if (resultWorkOrderId && onViewWorkOrder) {
        onViewWorkOrder(resultWorkOrderId)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authorization failed'
      setError(message)
      setAuthorizationComplete(false)
    } finally {
      setIsLoading(false)
    }
  }

  if (workOrderId || authorizationComplete) {
    return (
      <div style={{
        marginTop: 24,
        padding: '24px 20px',
        borderRadius: 14,
        border: '2px solid #16a34a',
        background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>✅</div>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#15803d', marginBottom: 8 }}>
          Authorization Complete
        </h3>
        <p style={{ fontSize: 14, color: '#166534', marginBottom: 16, lineHeight: 1.6 }}>
          Your work order has been created.
          We&apos;ll get started right away!
        </p>
        {onViewWorkOrder && workOrderId && (
          <button
            onClick={() => onViewWorkOrder(workOrderId)}
            style={{
              padding: '14px 24px',
              borderRadius: 10,
              border: 'none',
              background: '#16a34a',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(22,163,74,0.2)',
            }}
            onMouseEnter={e => {
              const button = e.currentTarget
              button.style.background = '#15803d'
              button.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              const button = e.currentTarget
              button.style.background = '#16a34a'
              button.style.transform = 'translateY(0)'
            }}
          >
            View Work Order
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{
      marginTop: 24,
      borderRadius: 14,
      border: '1px solid #334155',
      background: '#1e293b',
      overflow: 'hidden',
    }}>

      {/* STEP 1: Pre-authorization summary bar */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid #334155',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: 10,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#4ade80', lineHeight: 1 }}>
            {approvedItemsCount}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Approved
          </span>
        </div>
        {declinedItemsCount > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#f87171', lineHeight: 1 }}>
              {declinedItemsCount}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Declined
            </span>
          </div>
        )}
        {pendingItemsCount > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#93c5fd', lineHeight: 1 }}>
              {pendingItemsCount}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Pending
            </span>
          </div>
        )}
        {approvedTotal !== undefined && approvedItemsCount > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'right' }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
              ${approvedTotal.toFixed(2)}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Approved Total
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: '20px 20px 24px' }}>

        {/* STEP 2: Authorization title + copy */}
        <h3 style={{
          fontSize: 16,
          fontWeight: 800,
          color: '#e2e8f0',
          marginBottom: 6,
        }}>
          {isReopening ? 'Re-authorize Approved Repairs' : 'Authorize Approved Repairs'}
        </h3>
        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 16 }}>
          By continuing, you authorize only the repairs you approved above.
          Declined items will not be included.
        </p>

        {/* STEP 3: Trust / contact note */}
        <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 20 }}>
          If you need to make changes before authorizing, please contact the shop before submitting your approval.
        </p>

        {approvedItemsCount === 0 && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 8,
            background: '#7c2d12',
            border: '1px solid #b45309',
            color: '#fed7aa',
            fontSize: 13,
            marginBottom: 16,
          }}>
            No approved items to authorize. Please approve repair items above.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Checkbox — unchanged handler */}
          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            cursor: approvedItemsCount > 0 ? 'pointer' : 'not-allowed',
            opacity: approvedItemsCount > 0 ? 1 : 0.5,
          }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              disabled={approvedItemsCount === 0}
              style={{
                marginTop: 3,
                width: 18,
                height: 18,
                cursor: 'pointer',
                accentColor: '#16a34a',
              }}
            />
            <span style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.5 }}>
              I understand and authorize the approved repairs and services for my vehicle.
            </span>
          </label>

          {/* Customer Name Input — unchanged */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 700,
              color: '#94a3b8',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Customer Name (optional)
            </label>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
              disabled={!checked || approvedItemsCount === 0 || isLoading}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid #475569',
                background: '#0f172a',
                color: '#e2e8f0',
                fontSize: 14,
                outline: 'none',
                transition: 'all 0.2s',
                opacity: !checked || approvedItemsCount === 0 || isLoading ? 0.5 : 1,
                cursor: !checked || approvedItemsCount === 0 || isLoading ? 'not-allowed' : 'text',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = '#16a34a'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.1)'
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = '#475569'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* Error Message — unchanged */}
          {error && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 8,
              background: '#7f1d1d',
              border: '1px solid #dc2626',
              color: '#fca5a5',
              fontSize: 13,
              lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          {/* STEP 4: CTA — unchanged handler, improved layout */}
          <button
            onClick={handleAuthorize}
            disabled={!canAuthorize}
            style={{
              width: '100%',
              padding: '17px 20px',
              borderRadius: 10,
              border: 'none',
              background: canAuthorize ? '#16a34a' : '#334155',
              color: canAuthorize ? '#fff' : '#64748b',
              fontSize: 15,
              fontWeight: 700,
              cursor: canAuthorize ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              boxShadow: canAuthorize ? '0 4px 14px rgba(22,163,74,0.25)' : 'none',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={e => {
              if (canAuthorize) {
                e.currentTarget.style.background = '#15803d'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(22,163,74,0.35)'
              }
            }}
            onMouseLeave={e => {
              if (canAuthorize) {
                e.currentTarget.style.background = '#16a34a'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(22,163,74,0.25)'
              }
            }}
          >
            {isLoading
              ? '…Processing'
              : isReopening
                ? 'Re-authorize Approved Repairs'
                : `Authorize ${approvedItemsCount > 0 ? `${approvedItemsCount} Approved Repair${approvedItemsCount !== 1 ? 's' : ''}` : 'Repairs'}`}
          </button>

        </div>
      </div>
    </div>
  )
}
