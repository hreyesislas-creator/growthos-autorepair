import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import {
  getInspectionById,
  getInspectionItemsByInspectionId,
  getTemplateItems,
  getInspectionTemplates,
  getInspectionRecommendations,
  getTenantUserById,
} from '@/lib/queries'
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

  // ── DEBUG: confirm which inspection is being loaded ───────────────────────
  console.log('[PAGE] inspectionId:', params.id)
  // ─────────────────────────────────────────────────────────────────────────

  // ── Step 1: Fetch inspection header, saved items, and recommendations in
  //            parallel.  Items use the dedicated function so the query path
  //            is explicit and isolated from getInspectionById.
  const [{ inspection }, existingItemsRaw, recommendations] = await Promise.all([
    getInspectionById(tenantId, params.id),
    getInspectionItemsByInspectionId(params.id),
    getInspectionRecommendations(tenantId, params.id),
  ])

  if (!inspection) return notFound()

  // ── DEBUG ─────────────────────────────────────────────────────────────────
  console.log('[PAGE] existingItemsRaw:', existingItemsRaw)
  // ─────────────────────────────────────────────────────────────────────────

  // Map raw DB rows → ExistingItem shape expected by InspectionChecklist.
  //   template_item_id  → template_item_id  (unchanged)
  //   status            → status            (DB value: pass | attention | urgent | not_checked)
  //   notes             → notes             (unchanged)
  //
  // The component's dbToUi() translates status → UI result internally.
  const existingItems = existingItemsRaw.map(row => ({
    template_item_id: row.template_item_id,
    status:           row.status,
    notes:            row.notes,
  }))

  // ── DEBUG ─────────────────────────────────────────────────────────────────
  console.log('[PAGE] existingItemsMapped:', existingItems)
  // ─────────────────────────────────────────────────────────────────────────

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
        initialRecommendations={recommendations}
        technician={technician}
      />
    </>
  )
}
