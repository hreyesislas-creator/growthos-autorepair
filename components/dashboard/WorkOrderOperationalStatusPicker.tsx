'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition, type SyntheticEvent } from 'react'
import type { WorkOrderOperationalStatus } from '@/lib/types'
import { updateWorkOrderOperationalStatus } from '@/app/dashboard/work-orders/[id]/actions'
import StatusBadge from '@/components/dashboard/StatusBadge'

const OPERATIONAL_OPTIONS: { value: WorkOrderOperationalStatus; label: string }[] = [
  { value: 'waiting_on_parts', label: 'Waiting on Parts' },
  { value: 'waiting_on_customer', label: 'Waiting on Customer' },
  { value: 'waiting_on_insurance', label: 'Waiting on Insurance' },
  { value: 'waiting_on_sublet', label: 'Waiting on Sublet' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'need_to_order_parts', label: 'Need to Order Parts' },
]

const OPERATIONAL_LABELS: Record<WorkOrderOperationalStatus, string> = Object.fromEntries(
  OPERATIONAL_OPTIONS.map(o => [o.value, o.label]),
) as Record<WorkOrderOperationalStatus, string>

export type WorkOrderOperationalStatusPickerProps = {
  workOrderId: string
  operationalStatus: WorkOrderOperationalStatus | null
  /** Lifecycle `work_orders.status` string for fallback badge */
  lifecycleStatus: string
  /** Optional label override for lifecycle StatusBadge (e.g. Ready for Pickup) */
  lifecycleBadgeLabel?: string | null
  canMutate: boolean
}

function swallow(e: SyntheticEvent) {
  e.stopPropagation()
}

export default function WorkOrderOperationalStatusPicker({
  workOrderId,
  operationalStatus,
  lifecycleStatus,
  lifecycleBadgeLabel,
  canMutate,
}: WorkOrderOperationalStatusPickerProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [operational, setOperational] = useState<WorkOrderOperationalStatus | null>(operationalStatus)

  useEffect(() => {
    setOperational(operationalStatus)
  }, [operationalStatus])

  const badgeRow = operational ? (
    <span className="badge badge-yellow">{OPERATIONAL_LABELS[operational]}</span>
  ) : lifecycleBadgeLabel ? (
    <StatusBadge status={lifecycleStatus} label={lifecycleBadgeLabel} />
  ) : (
    <StatusBadge status={lifecycleStatus} />
  )

  if (!canMutate) {
    return <>{badgeRow}</>
  }

  const selectValue = operational ?? ''

  return (
    <div
      className="pipeline-wo-status-picker"
      onClick={swallow}
      onMouseDown={swallow}
      onKeyDown={swallow}
      role="presentation"
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, maxWidth: '100%' }}>
        {badgeRow}
        <select
          className="pipeline-wo-operational-select"
          aria-label="Operational status"
          value={selectValue}
          disabled={pending}
          onChange={e => {
            const raw = e.target.value
            const next: WorkOrderOperationalStatus | null = raw === '' ? null : (raw as WorkOrderOperationalStatus)
            const prev = operational
            setOperational(next)
            startTransition(async () => {
              try {
                await updateWorkOrderOperationalStatus(workOrderId, next)
                router.refresh()
              } catch (err) {
                console.error('[WorkOrderOperationalStatusPicker]', err)
                setOperational(prev)
              }
            })
          }}
          onClick={swallow}
          onMouseDown={swallow}
        >
          <option value="">Default (lifecycle status)</option>
          {OPERATIONAL_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
