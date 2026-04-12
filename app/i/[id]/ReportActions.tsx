'use client'

import { useState } from 'react'

interface Props {
  inspectionId: string
}

export function ReportActions({ inspectionId }: Props) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const url = `${window.location.origin}/i/${inspectionId}`
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => alert(`Inspection link: ${url}`))
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <a
        href={`/i/${inspectionId}/print`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          padding: '7px 14px',
          background: '#fff',
          border: '1px solid #d1d5db',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          color: '#374151',
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        🖨 Print Report
      </a>
      <button
        type="button"
        onClick={handleCopy}
        style={{
          padding: '7px 14px',
          background: '#fff',
          border: '1px solid #d1d5db',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          color: '#374151',
          cursor: 'pointer',
        }}
      >
        {copied ? '✓ Copied!' : '🔗 Copy Link'}
      </button>
    </div>
  )
}
