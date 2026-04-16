'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { AppRole } from '@/lib/auth/role-access'
import type { WorkOrderListRow } from './page'
import AdvisorTechnicianFilterSelect from '@/components/dashboard/AdvisorTechnicianFilterSelect'
import {
  applyAssignmentListFilters,
  sortForTechnicianListPriority,
  assignmentLabelForRow,
  assigneeBadgeDisplay,
  type AdvisorTechnicianFilterOption,
  type AssignmentListScope,
} from '@/lib/dashboard/assignment-list-helpers'

// ─────────────────────────────────────────────────────────────────────────────
// Status badge styles — keyed by raw DB status value
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  draft:       { bg: '#e2e8f0', color: '#1e293b', label: 'Draft'       },
  ready:       { bg: '#dbeafe', color: '#1e40af', label: 'Ready'       },
  in_progress: { bg: '#fef9c3', color: '#854d0e', label: 'In Progress' },
  completed:   { bg: '#dcfce7', color: '#14532d', label: 'Completed'   },
  invoiced:    { bg: '#ede9fe', color: '#4c1d95', label: 'Invoiced'    },
}

function statusStyle(status: string) {
  return STATUS_STYLES[status] ?? { bg: '#f1f5f9', color: '#475569', label: status }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  workOrders:                 WorkOrderListRow[]
  assignmentScope:            AssignmentListScope
  appRole:                    AppRole
  currentTenantUserId:        string
  advisorTechnicianId:        string | null
  technicianNameById:         Record<string, string>
  advisorTechnicianOptions:   AdvisorTechnicianFilterOption[]
  showAdvisorTechFilter:      boolean
}

function AssignmentBadge({
  technicianId,
  currentTenantUserId,
  nameById,
}: {
  technicianId:        string | null
  currentTenantUserId: string
  nameById:            Record<string, string>
}) {
  const d = assigneeBadgeDisplay(technicianId, currentTenantUserId, nameById)
  const cfg =
    d.kind === 'you'
      ? { bg: '#dcfce7', color: '#15803d' }
      : d.kind === 'unassigned'
      ? { bg: '#f1f5f9', color: '#64748b' }
      : { bg: '#ffedd5', color: '#c2410c' }

  return (
    <span style={{
      display: 'inline-block',
      fontSize: 10, fontWeight: 700,
      padding: '3px 8px', borderRadius: 999,
      background: cfg.bg, color: cfg.color,
      whiteSpace: 'nowrap',
      maxWidth: 200,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}>
      {d.text}
    </span>
  )
}

export default function WorkOrdersList({
  workOrders,
  assignmentScope,
  appRole,
  currentTenantUserId,
  advisorTechnicianId,
  technicianNameById,
  advisorTechnicianOptions,
  showAdvisorTechFilter,
}: Props) {
  const [query,        setQuery]        = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const basePath = '/dashboard/work-orders'

  // ── Filter logic ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = applyAssignmentListFilters(
      workOrders,
      assignmentScope,
      advisorTechnicianId,
      currentTenantUserId,
      appRole,
    )
    result = sortForTechnicianListPriority(result, appRole, currentTenantUserId)

    if (statusFilter !== 'all') {
      result = result.filter(wo => wo.status === statusFilter)
    }

    const q = query.trim().toLowerCase()
    if (q) {
      result = result.filter(wo =>
        (wo.work_order_number ?? '').toLowerCase().includes(q) ||
        (wo.customerName      ?? '').toLowerCase().includes(q) ||
        (wo.vehicleLabel      ?? '').toLowerCase().includes(q) ||
        (wo.estimate_number   ?? '').toLowerCase().includes(q),
      )
    }

    return result
  }, [
    workOrders,
    query,
    statusFilter,
    assignmentScope,
    appRole,
    currentTenantUserId,
    advisorTechnicianId,
  ])

  // ─────────────────────────────────────────────────────────────────────────
  const showAllAssigneePill = appRole !== 'technician'
  const techFilterActive = !!advisorTechnicianId
  const allPillActive = !techFilterActive && assignmentScope === 'all' && showAllAssigneePill
  const minePillActive = !techFilterActive && assignmentScope === 'mine'
  const unassignedPillActive = !techFilterActive && assignmentScope === 'unassigned'

  return (
    <div className="dash-content">

      {/* ── Assignment scope (Phase 6.5) ─────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Assignee:</span>
        {showAllAssigneePill && (
          <Link
            href={basePath}
            className={allPillActive ? 'btn-primary' : 'btn-ghost'}
            style={{ fontSize: 12, padding: '6px 12px', textDecoration: 'none' }}
          >
            All
          </Link>
        )}
        <Link
          href={`${basePath}?scope=mine`}
          className={minePillActive ? 'btn-primary' : 'btn-ghost'}
          style={{ fontSize: 12, padding: '6px 12px', textDecoration: 'none' }}
        >
          Assigned to me
        </Link>
        <Link
          href={`${basePath}?scope=unassigned`}
          className={unassignedPillActive ? 'btn-primary' : 'btn-ghost'}
          style={{ fontSize: 12, padding: '6px 12px', textDecoration: 'none' }}
        >
          Unassigned
        </Link>
        {showAdvisorTechFilter && advisorTechnicianOptions.length > 0 && (
          <AdvisorTechnicianFilterSelect
            basePath={basePath}
            assignmentScope={assignmentScope}
            options={advisorTechnicianOptions}
            currentTechId={advisorTechnicianId}
          />
        )}
        {appRole === 'technician' && assignmentScope !== 'all' && (
          <Link
            href={basePath}
            className="btn-ghost"
            style={{ fontSize: 12, padding: '6px 12px', textDecoration: 'none' }}
          >
            Full shop list
          </Link>
        )}
      </div>
      {appRole === 'technician' && assignmentScope === 'all' && (
        <div style={{
          fontSize: 12, color: 'var(--text-3)', marginBottom: 12, marginTop: -4,
        }}>
          Your assigned and unassigned jobs are listed first.
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center',
        marginBottom: 16, flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 400 }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 14, color: 'var(--text-3)', pointerEvents: 'none',
          }}>🔍</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by WO #, customer, vehicle, or estimate…"
            className="field-input"
            style={{ width: '100%', paddingLeft: 32, fontSize: 13, padding: '8px 10px 8px 32px' }}
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="field-input"
          style={{ fontSize: 13, padding: '8px 10px', flexShrink: 0 }}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="ready">Ready</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="invoiced">Invoiced</option>
        </select>

        {/* Count */}
        <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>
          {filtered.length} of {workOrders.length} work order{workOrders.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table / empty state ───────────────────────────────────────────── */}
      <div className="table-wrap">
        {workOrders.length === 0 ? (

          <div className="empty-state">
            <div className="empty-state-icon">🔧</div>
            <div className="empty-state-title">No work orders yet</div>
            <div className="empty-state-body">
              Open an estimate with approved items and click <strong>Create Work Order</strong> to get started.
            </div>
          </div>

        ) : filtered.length === 0 ? (

          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-title">No matching work orders</div>
            <div className="empty-state-body">
              {advisorTechnicianId
                ? 'Try another technician or use the assignee pills to widen the list.'
                : 'Try a different search term or clear the status filter.'}
            </div>
          </div>

        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ whiteSpace: 'nowrap' }}>Work Order #</th>
                <th style={{ whiteSpace: 'nowrap' }}>Assignee</th>
                <th>Status</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th style={{ whiteSpace: 'nowrap' }}>Source Estimate</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ whiteSpace: 'nowrap' }}>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(wo => {
                const s = statusStyle(wo.status)
                const createdLabel = new Date(wo.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })

                const assignLabel = assignmentLabelForRow(wo.technician_id, currentTenantUserId)

                return (
                  <tr
                    key={wo.id}
                    style={
                      assignLabel === 'you'
                        ? { background: 'rgba(220, 252, 231, 0.4)' }
                        : undefined
                    }
                  >

                    {/* WO # */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 13,
                        fontWeight: 700, color: 'var(--text)',
                      }}>
                        {wo.work_order_number ?? '—'}
                      </span>
                    </td>

                    <td>
                      <AssignmentBadge
                        technicianId={wo.technician_id}
                        currentTenantUserId={currentTenantUserId}
                        nameById={technicianNameById}
                      />
                    </td>

                    {/* Status badge */}
                    <td>
                      <span style={{
                        display: 'inline-block',
                        fontSize: 11, fontWeight: 700,
                        padding: '3px 10px', borderRadius: 999,
                        background: s.bg, color: s.color,
                        whiteSpace: 'nowrap',
                      }}>
                        {s.label}
                      </span>
                    </td>

                    {/* Customer */}
                    <td style={{ fontSize: 13, color: 'var(--text)' }}>
                      {wo.customerName ?? <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>

                    {/* Vehicle */}
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>
                      {wo.vehicleLabel ?? <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>

                    {/* Source estimate */}
                    <td style={{ fontSize: 12 }}>
                      {wo.estimate_number ? (
                        <Link
                          href={`/dashboard/estimates/${wo.estimate_id}`}
                          style={{
                            color: 'var(--text-2)', fontFamily: 'var(--font-mono)',
                            textDecoration: 'none',
                          }}
                        >
                          {wo.estimate_number}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--text-3)' }}>—</span>
                      )}
                    </td>

                    {/* Total */}
                    <td style={{
                      fontFamily: 'var(--font-mono)', fontSize: 13,
                      fontWeight: 700, color: 'var(--text)', textAlign: 'right',
                      whiteSpace: 'nowrap',
                    }}>
                      ${wo.total.toFixed(2)}
                    </td>

                    {/* Created */}
                    <td style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                      {createdLabel}
                    </td>

                    {/* Actions */}
                    <td>
                      <Link
                        href={`/dashboard/work-orders/${wo.id}`}
                        className="btn-ghost"
                        style={{ padding: '3px 10px', fontSize: '12px', whiteSpace: 'nowrap' }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
