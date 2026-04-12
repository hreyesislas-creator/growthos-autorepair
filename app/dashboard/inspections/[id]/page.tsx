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
import { createClient } from '@/lib/supabase/server'
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

  const supabase = await createClient()

  // ── Step 1: Fetch inspection header, saved items, recommendations, and the
  //            linked estimate (if one was created from this inspection) in
  //            parallel.  The estimate query drives the "View Estimate" card.
  const [{ inspection }, existingItemsRaw, recommendations, linkedEstimateRes] = await Promise.all([
    getInspectionById(tenantId, params.id),
    getInspectionItemsByInspectionId(params.id),
    getInspectionRecommendations(tenantId, params.id),
    // Find the most-recent estimate linked to this inspection.
    // createEstimateFromInspection() stores inspection_id on the estimate row
    // and returns an existing draft on repeat calls — so at most one row exists
    // per inspection at any given time.
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

  if (!inspection) return notFound()

  // ── DEBUG ─────────────────────────────────────────────────────────────────
  console.log('[PAGE] existingItemsRaw:', existingItemsRaw)
  // ─────────────────────────────────────────────────────────────────────────

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

  // ── DEBUG ─────────────────────────────────────────────────────────────────
  console.log('[PAGE] existingItemsMapped:', existingItems)
  // ─────────────────────────────────────────────────────────────────────────

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
      />
    </>
  )
}
