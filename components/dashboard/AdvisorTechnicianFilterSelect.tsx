'use client'

import { useRouter } from 'next/navigation'
import type {
  AdvisorTechnicianFilterOption,
  AssignmentListScope,
} from '@/lib/dashboard/assignment-list-helpers'

interface Props {
  basePath:          string
  assignmentScope:   AssignmentListScope
  options:           AdvisorTechnicianFilterOption[]
  currentTechId:     string | null
}

/**
 * Advisor/admin: narrow list to one technician (`?tech=uuid`). Clearing returns to scope pills only.
 */
export default function AdvisorTechnicianFilterSelect({
  basePath,
  assignmentScope,
  options,
  currentTechId,
}: Props) {
  const router = useRouter()

  function scopeQuery(): string {
    if (assignmentScope === 'mine') return '?scope=mine'
    if (assignmentScope === 'unassigned') return '?scope=unassigned'
    return ''
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Technician:</span>
      <select
        className="field-input"
        style={{ fontSize: 12, padding: '6px 10px', minWidth: 180, maxWidth: 280 }}
        value={currentTechId ?? ''}
        onChange={e => {
          const v = e.target.value
          if (!v) {
            router.push(`${basePath}${scopeQuery()}`)
            return
          }
          router.push(`${basePath}?tech=${encodeURIComponent(v)}`)
        }}
      >
        <option value="">All technicians</option>
        {options.map(o => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
