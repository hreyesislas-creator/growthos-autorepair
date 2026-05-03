'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from 'react'

import AdvisorSmsPreviewModal from '@/components/dashboard/AdvisorSmsPreviewModal'
import type { AdvisorJobSmsTemplateId } from '@/lib/sms/advisorJobSmsTemplates'
import { previewAdvisorJobSmsTemplate } from '@/lib/sms/advisorJobSmsTemplates'

function normalizeTelHref(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}

export type PipelineJobBoardCardProps = {
  detailHref: string
  shellStyle: CSSProperties
  customerPhone?: string | null
  /** Shown in SMS preview modal / template. */
  smsCustomerName: string
  smsVehicleLine: string
  shopName?: string | null
  isEstimate?: boolean
  isReadyPickup?: boolean
  children: ReactNode
}

/**
 * Job board card: primary area navigates via router.push (no nested links).
 * Quick actions use tel: or router.push only — no SMS APIs.
 */
export default function PipelineJobBoardCard({
  detailHref,
  shellStyle,
  customerPhone,
  smsCustomerName,
  smsVehicleLine,
  shopName,
  isEstimate,
  isReadyPickup,
  children,
}: PipelineJobBoardCardProps) {
  const router = useRouter()
  const [smsModal, setSmsModal] = useState<AdvisorJobSmsTemplateId | null>(null)

  const raw = customerPhone?.trim()
  const telHref = raw ? normalizeTelHref(raw) : ''
  const canCall = telHref.length > 0

  const previewText = useMemo(() => {
    if (!smsModal) return ''
    return previewAdvisorJobSmsTemplate(smsModal, {
      customerName: smsCustomerName,
      vehicle: smsVehicleLine,
      shopName,
    })
  }, [smsModal, smsCustomerName, smsVehicleLine, shopName])

  function openDetail() {
    router.push(detailHref)
  }

  function onCardKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openDetail()
    }
  }

  function swallowCardClick(e: MouseEvent | KeyboardEvent) {
    e.stopPropagation()
  }

  function openSmsPreview(id: AdvisorJobSmsTemplateId) {
    setSmsModal(id)
  }

  function closeSmsPreview() {
    setSmsModal(null)
  }

  return (
    <>
      <div
        className="pipeline-job-card"
        role="button"
        tabIndex={0}
        onClick={openDetail}
        onKeyDown={onCardKeyDown}
        style={{ ...shellStyle, cursor: 'pointer' }}
      >
        {children}
        <div
          onClick={swallowCardClick}
          onKeyDown={swallowCardClick}
          style={{
            marginTop: 8,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '6px 10px',
          }}
        >
          {canCall ? (
            <a
              href={`tel:${telHref}`}
              className="pipeline-action"
              onClick={swallowCardClick}
            >
              Call
            </a>
          ) : null}
          <button type="button" className="pipeline-action" onClick={() => router.push(detailHref)}>
            Open
          </button>
          <button type="button" className="pipeline-action" onClick={() => router.push('/dashboard/communications')}>
            Log
          </button>
          {isEstimate ? (
            <button type="button" className="pipeline-action" onClick={() => openSmsPreview('estimate_followup')}>
              Follow up
            </button>
          ) : null}
          {isReadyPickup ? (
            <button
              type="button"
              className="pipeline-action"
              aria-label="Notify customer"
              onClick={() => openSmsPreview('ready_for_pickup')}
            >
              Notify customer
            </button>
          ) : null}
        </div>
      </div>

      <AdvisorSmsPreviewModal
        open={smsModal !== null}
        onClose={closeSmsPreview}
        customerName={smsCustomerName}
        phoneDisplay={raw ?? null}
        previewMessage={previewText}
      />
    </>
  )
}
