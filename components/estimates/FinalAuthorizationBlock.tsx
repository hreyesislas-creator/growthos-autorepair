'use client'

import { useState } from 'react'

interface FinalAuthorizationBlockProps {
  approvedItemsCount: number
  workOrderId?: string
  onAuthorize: (customerName: string | null) => Promise<string | void>
  onViewWorkOrder?: (workOrderId: string) => void
  isReopening?: boolean
}

export default function FinalAuthorizationBlock({
  approvedItemsCount,
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
      padding: '24px 20px',
      borderRadius: 14,
      border: '1px solid #475569',
      background: '#1e293b',
    }}>
      <h3 style={{
        fontSize: 16,
        fontWeight: 800,
        color: '#e2e8f0',
        marginBottom: 20,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {isReopening ? 'Re-authorize Approved Repairs' : 'Final Authorization'}
      </h3>

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
        {/* Checkbox */}
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

        {/* Customer Name Input */}
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

        {/* Error Message */}
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

        {/* Authorize Button */}
        <button
          onClick={handleAuthorize}
          disabled={!canAuthorize}
          style={{
            width: '100%',
            padding: '16px 20px',
            borderRadius: 10,
            border: 'none',
            background: canAuthorize ? '#16a34a' : '#475569',
            color: canAuthorize ? '#fff' : '#94a3b8',
            fontSize: 15,
            fontWeight: 700,
            cursor: canAuthorize ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            boxShadow: canAuthorize ? '0 4px 12px rgba(22,163,74,0.2)' : 'none',
            letterSpacing: '0.01em',
          }}
          onMouseEnter={e => {
            if (canAuthorize) {
              e.currentTarget.style.background = '#15803d'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(22,163,74,0.3)'
            }
          }}
          onMouseLeave={e => {
            if (canAuthorize) {
              e.currentTarget.style.background = '#16a34a'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(22,163,74,0.2)'
            }
          }}
        >
          {isLoading ? '…Processing' : (isReopening ? 'Re-authorize Approved Repairs' : 'Authorize Approved Repairs')}
        </button>
      </div>
    </div>
  )
}
