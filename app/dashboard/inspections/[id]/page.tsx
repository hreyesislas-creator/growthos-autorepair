import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import {
  getInspectionById,
  getTemplateItems,
  getInspectionTemplates,
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
    // Prefer section_name; fall back to section, then category, then 'General'
    const key =
      item.section_name?.trim() ||
      item.section?.trim() ||
      item.category?.trim() ||
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

  const { inspection, items: existingItems } = await getInspectionById(
    tenantId,
    params.id,
  )

  if (!inspection) return notFound()

  // Resolve template: use the inspection's template_id, or fall back to the
  // tenant's default template so there is always a checklist to show.
  let templateId = inspection.template_id ?? null

  if (!templateId) {
    const templates = await getInspectionTemplates(tenantId)
    const defaultTpl =
      templates.find(t => t.is_default) ?? templates[0] ?? null
    templateId = defaultTpl?.id ?? null
  }

  const templateItems = templateId
    ? await getTemplateItems(templateId, tenantId)
    : []

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
        existingItems={existingItems as any[]}
      />
    </>
  )
}
