import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import {
  getInspectionById,
  getInspectionItemsByInspectionId,
  getTemplateItems,
  getInspectionTemplates,
  getInspectionRecommendations,
  getTenantUserById,
  getTeamUsers,
} from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import {
  canEditDashboardModule,
  getCurrentAppRoleForTenant,
  isAdmin,
} from '@/lib/auth/roles'
import {
  getCurrentDashboardTenantUser,
  technicianMayMutateAssignedRecord,
} from '@/lib/auth/operational-assignment'
import Topbar from '@/components/dashboard/Topbar'
import InspectionChecklist from './InspectionChecklist'
import type { InspectionTemplateItem } from '@/lib/types'

export const metadata = { title: 'Inspection Detail' }

/** Group a flat item list into ordered sections */
function groupBySection(items: InspectionTemplateItem[]): {
  section_name: string
  items: InspectionTemplateItem[]
}[] {
  const map = new Map<string, InspectionTemplateItem[]>()

  for (const item of items) {
    const key =
      item.section_name?.trim() ||
      item.section?.trim()      ||
      item.category?.trim()     ||
      'General'

    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }

  return Array.from(map.entries()).map(([section_name, items]) => ({
    section_name,
    items,
  }))
}

export default async function InspectionDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const ctx = await getDashboardTenant()
  if (!ctx) return notFound()

  const tenantId = ctx.tenant.id

  const [role, dashboardDu] = await Promise.all([
    getCurrentAppRoleForTenant(),
    getCurrentDashboardTenantUser(),
  ])
  if (role === 'technician' && !dashboardDu?.tenantUserId) return notFound()

  const inspectionByIdOpts =
    role === 'technician' && dashboardDu?.tenantUserId
      ? { technicianIdEq: dashboardDu.tenantUserId }
      : undefined

  const { inspection } = await getInspectionById(tenantId, params.id, inspectionByIdOpts)
  if (!inspection) return notFound()

  const supabase = await createClient()

  // Header must authorize before items, recommendations, or linked estimate (query-level isolation).
  const [existingItemsRaw, recommendations, linkedEstimateRes] = await Promise.all([
    getInspectionItemsByInspectionId(params.id),
    getInspectionRecommendations(tenantId, params.id),
    supabase
      .from('estimates')
      .select('id, estimate_number, status, updated_at')
      .eq('tenant_id', tenantId)
      .eq('inspection_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const linkedEstimate = (linkedEstimateRes.data ?? null) as {
    id:              string
    estimate_number: string
    status:          string
    updated_at:      string | null
  } | null

  // Map raw DB rows → ExistingItem shape expected by InspectionChecklist.
  //   template_item_id  → template_item_id  (unchanged)
  //   result            → status            (DB col "result" maps to local prop "status")
  //   note              → notes             (DB col "note" maps to local prop "notes")
  //
  // The component's dbToUi() translates status → UI result internally.
  const existingItems = existingItemsRaw.map(row => ({
    id:               row.id,
    template_item_id: row.template_item_id,
    status:           row.result,
    notes:            row.note,
  }))

  // ── Load existing photos for saved inspection item rows ──────────────────
  const existingItemIds = existingItemsRaw.map(row => row.id).filter(Boolean)

  const existingPhotos = existingItemIds.length === 0
    ? []
    : await supabase
        .from('inspection_item_photos')
        .select('id, inspection_item_id, image_url, caption')
        .in('inspection_item_id', existingItemIds)
        .order('created_at', { ascending: true })
        .then(({ data }) => data ?? [])

  // ── Step 2: Resolve template ID ──────────────────────────────────────────
  let templateId = inspection.template_id ?? null

  if (!templateId) {
    const templates = await getInspectionTemplates(tenantId)
    const defaultTpl = templates.find(t => t.is_default) ?? templates[0] ?? null
    templateId = defaultTpl?.id ?? null
  }

  // ── Step 3: Fetch template items + technician user in parallel ────────────
  const [templateItems, technician] = await Promise.all([
    templateId ? getTemplateItems(templateId, tenantId) : Promise.resolve([]),
    inspection.technician_id
      ? getTenantUserById(tenantId, inspection.technician_id)
      : Promise.resolve(null),
  ])

  const sections = groupBySection(templateItems)

  const [canEditInspectionsModule, canEditEstimates, teamUsers] = await Promise.all([
    canEditDashboardModule('inspections'),
    canEditDashboardModule('estimates'),
    getTeamUsers(tenantId),
  ])

  const assignableTeamUsers = teamUsers.filter(u => {
    if (!u.is_active) return false
    const r = u.role
    return r === 'technician' || r === 'staff' || r === 'admin' || r === 'owner' || r === 'manager'
  })

  const canAssignTechnician =
    canEditInspectionsModule && (isAdmin(role) || role === 'service_advisor')

  const currentTenantUserId = dashboardDu?.tenantUserId ?? ''
  const canEditInspections =
    canEditInspectionsModule &&
    technicianMayMutateAssignedRecord(
      role,
      inspection.technician_id ?? null,
      currentTenantUserId || '__no_user__',
    )

  const assignmentReadOnlyBanner =
    canEditInspectionsModule && !canEditInspections && role === 'technician'
      ? inspection.technician_id
        ? 'You can view this inspection but only the assigned technician can edit it.'
        : 'No technician is assigned. A service advisor must assign one before you can edit this inspection.'
      : null

  return (
    <>
      <Topbar
        title="Digital Vehicle Inspection"
        subtitle={`Status: ${inspection.status}`}
        action={{ label: '← Inspections', href: '/dashboard/inspections' }}
      />
      <InspectionChecklist
        inspection={inspection}
        sections={sections}
        existingItems={existingItems}
        existingPhotos={existingPhotos}
        initialRecommendations={recommendations}
        technician={technician}
        linkedEstimate={linkedEstimate}
        canEditInspections={canEditInspections}
        canEditEstimates={canEditEstimates}
        canAssignTechnician={canAssignTechnician}
        teamUsersForAssignment={assignableTeamUsers}
        assignmentReadOnlyBanner={assignmentReadOnlyBanner}
        showTechnicianSelfAssign={role === 'technician' && !inspection.technician_id}
      />
    </>
  )
}
