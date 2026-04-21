import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import { getInspections, getInspectionTemplates, getTeamUsers } from '@/lib/queries'
import { canEditDashboardModule, getCurrentAppRoleForTenant } from '@/lib/auth/roles'
import { getCurrentDashboardTenantUser } from '@/lib/auth/operational-assignment'
import {
  sortForTechnicianListPriority,
  assignmentLabelForRow,
  parseAssignmentListScope,
  parseAdvisorTechnicianFilterParam,
  assigneeBadgeDisplay,
  applyAssignmentListFilters,
  technicianNameMapFromTeamUsers,
  advisorTechnicianFilterOptionsFromTeamUsers,
  validatedAdvisorTechnicianId,
  canUseAdvisorTechnicianFilter,
} from '@/lib/dashboard/assignment-list-helpers'
import Topbar from '@/components/dashboard/Topbar'
import StatusBadge from '@/components/dashboard/StatusBadge'
import AdvisorTechnicianFilterSelect from '@/components/dashboard/AdvisorTechnicianFilterSelect'
import Link from 'next/link'
import { format } from 'date-fns'
import type { InspectionRow } from '@/lib/types'

export const metadata = { title: 'Inspections' }

function AssigneeCell({
  inspection,
  currentTenantUserId,
  nameById,
}: {
  inspection: InspectionRow
  currentTenantUserId: string
  nameById: Record<string, string>
}) {
  const d = assigneeBadgeDisplay(inspection.technician_id ?? null, currentTenantUserId, nameById)
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

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: { scope?: string; tech?: string }
}) {
  const ctx = await getDashboardTenant()
  if (!ctx) return notFound()

  const tenantId = ctx.tenant.id

  const [appRole, dashboardDu] = await Promise.all([
    getCurrentAppRoleForTenant(),
    getCurrentDashboardTenantUser(),
  ])

  const tenantUserId = dashboardDu?.tenantUserId ?? ''

  const [inspectionsRaw, templates, canEdit, teamUsers] = await Promise.all([
    appRole === 'technician'
      ? tenantUserId
        ? getInspections(tenantId, { technicianIdEq: tenantUserId })
        : Promise.resolve([] as InspectionRow[])
      : getInspections(tenantId),
    getInspectionTemplates(tenantId),
    canEditDashboardModule('inspections'),
    getTeamUsers(tenantId),
  ])

  let assignmentScope = parseAssignmentListScope(searchParams?.scope)
  // Data is already technician-scoped; force mine-only semantics regardless of ?scope=.
  if (appRole === 'technician') {
    assignmentScope = 'mine'
  }
  const advisorTechParsed = parseAdvisorTechnicianFilterParam(searchParams?.tech, appRole)
  const advisorTechnicianId = validatedAdvisorTechnicianId(advisorTechParsed, teamUsers)

  const technicianNameById = technicianNameMapFromTeamUsers(teamUsers)
  const advisorTechnicianOptions = advisorTechnicianFilterOptionsFromTeamUsers(teamUsers)
  const showAdvisorTechFilter = canUseAdvisorTechnicianFilter(appRole)

  let inspections = applyAssignmentListFilters(
    inspectionsRaw,
    assignmentScope,
    advisorTechnicianId,
    tenantUserId,
    appRole,
  )
  inspections = sortForTechnicianListPriority(inspections, appRole, tenantUserId)

  const basePath = '/dashboard/inspections'
  const showAllAssigneePill = appRole !== 'technician'
  const techFilterActive = !!advisorTechnicianId
  const allPillActive = !techFilterActive && assignmentScope === 'all' && showAllAssigneePill
  const minePillActive = !techFilterActive && assignmentScope === 'mine'
  const unassignedPillActive = !techFilterActive && assignmentScope === 'unassigned'

  return (
    <>
      <Topbar
        title="Inspections"
        action={canEdit ? { label: 'New Inspection', href: '/dashboard/inspections/new' } : undefined}
      />
      <div className="dash-content">

        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
          marginBottom: 16,
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
          {appRole !== 'technician' && (
            <Link
              href={`${basePath}?scope=unassigned`}
              className={unassignedPillActive ? 'btn-primary' : 'btn-ghost'}
              style={{ fontSize: 12, padding: '6px 12px', textDecoration: 'none' }}
            >
              Unassigned
            </Link>
          )}
          {showAdvisorTechFilter && advisorTechnicianOptions.length > 0 && (
            <AdvisorTechnicianFilterSelect
              basePath={basePath}
              assignmentScope={assignmentScope}
              options={advisorTechnicianOptions}
              currentTechId={advisorTechnicianId}
            />
          )}
        </div>

        {templates.length > 0 && (
          <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-3)', alignSelf: 'center' }}>Templates:</span>
            {templates.map(t => (
              <span key={t.id} className="badge badge-blue">{t.name}</span>
            ))}
          </div>
        )}

        <div className="table-wrap">
          {inspectionsRaw.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">{'\u{1F50D}'}</div>
              <div className="empty-state-title">No inspections yet</div>
              <div className="empty-state-body">Create your first digital vehicle inspection.</div>
            </div>
          ) : inspections.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">{'\u{1F50D}'}</div>
              <div className="empty-state-title">No inspections in this view</div>
              <div className="empty-state-body">
                {appRole === 'technician'
                  ? 'No inspections assigned to you match this view.'
                  : 'Try another assignee filter or switch assignee scope.'}
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Vehicle</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Assignee</th>
                  <th>Status</th>
                  <th>Template</th>
                  <th>Completed</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inspections.map(i => {
                  const vehicleDisplay = (() => {
                    const customerName = i.customer
                      ? `${i.customer.first_name} ${i.customer.last_name}`.trim()
                      : null
                    const vehicleInfo = i.vehicle
                      ? [i.vehicle.year, i.vehicle.make, i.vehicle.model]
                          .filter(Boolean)
                          .join(' ')
                      : null
                    if (customerName && vehicleInfo) return `${customerName} — ${vehicleInfo}`
                    if (customerName) return customerName
                    if (vehicleInfo) return vehicleInfo
                    return '—'
                  })()

                  const assignLabel = assignmentLabelForRow(i.technician_id ?? null, tenantUserId)

                  return (
                    <tr
                      key={i.id}
                      style={
                        assignLabel === 'you'
                          ? { background: 'rgba(220, 252, 231, 0.4)' }
                          : undefined
                      }
                    >
                      <td style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                        {format(new Date(i.created_at), 'MMM d, yyyy')}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>{vehicleDisplay}</td>
                      <td>
                        <AssigneeCell
                          inspection={i}
                          currentTenantUserId={tenantUserId}
                          nameById={technicianNameById}
                        />
                      </td>
                      <td><StatusBadge status={i.status} /></td>
                      <td style={{ fontSize: '12px' }}>{i.template_id ? 'Standard' : 'No template'}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                        {i.completed_at ? format(new Date(i.completed_at), 'MMM d') : '—'}
                      </td>
                      <td>
                        <Link
                          href={`/dashboard/inspections/${i.id}`}
                          className="btn-ghost"
                          style={{ padding: '3px 10px', fontSize: '12px' }}
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
    </>
  )
}
