/**
 * Printer-friendly public inspection report.
 * Route: /i/[id]/print
 *
 * No authentication required. Same data as /i/[id] but styled for print.
 * Data is fetched using the service-role admin client (bypasses RLS).
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { PrintButton } from './PrintButton'

export const dynamic = 'force-dynamic'

// ── Status helpers ─────────────────────────────────────────────────────────────

function statusLabel(status: string | null): string {
  switch (status) {
    case 'pass':        return 'OK'
    case 'attention':   return 'Warning'
    case 'urgent':      return 'Critical'
    case 'not_checked': return 'Not Checked'
    default:            return 'Not Checked'
  }
}

function statusColor(status: string | null): string {
  switch (status) {
    case 'pass':      return '#15803d'
    case 'attention': return '#b45309'
    case 'urgent':    return '#b91c1c'
    default:          return '#6b7280'
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface TemplateItem {
  id: string
  section_name: string | null
  section?: string | null
  category?: string | null
  label: string
  item_name?: string | null
  sort_order: number
}

interface SavedItem {
  id: string
  template_item_id: string | null
  result: string | null
  note: string | null
}

interface Photo {
  id: string
  inspection_item_id: string
  image_url: string | null
}

interface GroupedSection {
  section_name: string
  items: Array<{
    templateItem: TemplateItem
    savedItem:    SavedItem | null
    photos:       Photo[]
  }>
}

// ── Section grouping ───────────────────────────────────────────────────────────

function groupSections(
  templateItems: TemplateItem[],
  savedItems:    SavedItem[],
  photos:        Photo[],
): GroupedSection[] {
  const savedByTemplateId = new Map<string, SavedItem>()
  for (const si of savedItems) {
    if (si.template_item_id) savedByTemplateId.set(si.template_item_id, si)
  }

  const photosByItemId = new Map<string, Photo[]>()
  for (const p of photos) {
    if (!p.inspection_item_id) continue
    const arr = photosByItemId.get(p.inspection_item_id) ?? []
    arr.push(p)
    photosByItemId.set(p.inspection_item_id, arr)
  }

  const sectionMap = new Map<string, GroupedSection>()

  for (const ti of templateItems) {
    const key = ti.section_name?.trim() || ti.section?.trim() || ti.category?.trim() || 'General'
    if (!sectionMap.has(key)) sectionMap.set(key, { section_name: key, items: [] })
    const savedItem  = savedByTemplateId.get(ti.id) ?? null
    const itemPhotos = savedItem ? (photosByItemId.get(savedItem.id) ?? []) : []
    sectionMap.get(key)!.items.push({ templateItem: ti, savedItem, photos: itemPhotos })
  }

  // Fallback: render saved items that have no matching template row
  const templateItemById  = new Map<string, TemplateItem>()
  for (const ti of templateItems) templateItemById.set(ti.id, ti)
  const coveredTemplateIds = new Set(templateItems.map(ti => ti.id))

  for (const si of savedItems) {
    if (si.template_item_id && coveredTemplateIds.has(si.template_item_id)) continue
    const key = 'General'
    if (!sectionMap.has(key)) sectionMap.set(key, { section_name: key, items: [] })
    const itemPhotos     = photosByItemId.get(si.id) ?? []
    const matchedTemplate = si.template_item_id ? templateItemById.get(si.template_item_id) : undefined
    const label          = matchedTemplate?.label || matchedTemplate?.item_name || si.note?.trim() || 'Inspection Item'
    sectionMap.get(key)!.items.push({
      templateItem: { id: si.template_item_id ?? si.id, section_name: key, label, sort_order: 0 },
      savedItem: si,
      photos: itemPhotos,
    })
  }

  const severityRank: Record<string, number> = { urgent: 0, attention: 1, pass: 2, not_checked: 3 }
  const ranked = Array.from(sectionMap.values())
  for (const section of ranked) {
    section.items.sort((a, b) => {
      const ra = severityRank[a.savedItem?.result ?? ''] ?? 4
      const rb = severityRank[b.savedItem?.result ?? ''] ?? 4
      return ra - rb
    })
  }
  return ranked
}

// ── Metadata ───────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('inspections')
    .select('tenant_id')
    .eq('id', params.id)
    .maybeSingle()

  if (!data) return { title: 'Inspection Report' }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', data.tenant_id)
    .maybeSingle()

  return {
    title: `Inspection Report · ${tenant?.name ?? 'Auto Repair'}`,
    robots: { index: false, follow: false },
  }
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function PrintInspectionReportPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient()

  const { data: inspection } = await supabase
    .from('inspections')
    .select('id, tenant_id, customer_id, vehicle_id, template_id, status, notes, completed_at, created_at')
    .eq('id', params.id)
    .maybeSingle()

  if (!inspection) return notFound()

  const [savedItemsRes, customerRes, vehicleRes] = await Promise.all([
    supabase
      .from('inspection_items')
      .select('id, template_item_id, result, note')
      .eq('inspection_id', params.id),
    inspection.customer_id
      ? supabase.from('customers').select('first_name, last_name').eq('id', inspection.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    inspection.vehicle_id
      ? supabase.from('vehicles').select('year, make, model, trim, color, mileage, license_plate').eq('id', inspection.vehicle_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const savedItems = (savedItemsRes.data ?? []) as SavedItem[]
  const customer   = customerRes.data as { first_name: string; last_name: string } | null
  const vehicle    = vehicleRes.data  as { year: number | null; make: string | null; model: string | null; trim: string | null; color: string | null; mileage: number | null; license_plate: string | null } | null

  const templateItems = inspection.template_id
    ? await supabase
        .from('inspection_template_items')
        .select('*')
        .eq('template_id', inspection.template_id)
        .order('sort_order', { ascending: true })
        .then(({ data }) => data ?? [])
    : []

  const { data: photosData } = savedItems.length === 0
    ? { data: [] }
    : await supabase
        .from('inspection_item_photos')
        .select('id, inspection_item_id, image_url')
        .in('inspection_item_id', savedItems.map(si => si.id))

  const photos: Photo[]   = (photosData ?? []) as Photo[]
  const sections          = groupSections(templateItems, savedItems, photos)

  const counts = { ok: 0, warning: 0, critical: 0 }
  for (const si of savedItems) {
    if (si.result === 'pass')        counts.ok++
    else if (si.result === 'attention') counts.warning++
    else if (si.result === 'urgent')    counts.critical++
  }

  const customerName = customer
    ? `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim() || null
    : null

  const vehicleLabel = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(' ') || null
    : null

  const inspectionDate = inspection.completed_at ?? inspection.created_at
  const dateDisplay    = inspectionDate
    ? new Date(inspectionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <>
      {/* Print CSS */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #fff; color: #111; font-family: system-ui, -apple-system, sans-serif; }
        .no-print { display: block; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; color: #111 !important; }
          img { max-width: 100%; page-break-inside: avoid; }
          .section-card { page-break-inside: avoid; }
        }
      `}</style>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 64px', background: '#fff', color: '#111' }}>

        {/* Print button — hidden when printing */}
        <div className="no-print" style={{ marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center' }}>
          <PrintButton />
          <a
            href={`/i/${params.id}`}
            style={{
              padding: '8px 18px', background: '#f3f4f6', color: '#374151',
              border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            ← Back to Report
          </a>
        </div>

        {/* Header */}
        <div style={{ borderBottom: '2px solid #111', paddingBottom: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 4 }}>
            Vehicle Inspection Report
          </div>
          {dateDisplay && (
            <div style={{ fontSize: 13, color: '#374151', marginBottom: 10 }}>{dateDisplay}</div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            {customerName && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 2 }}>Customer</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{customerName}</div>
              </div>
            )}
            {vehicleLabel && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 2 }}>Vehicle</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{vehicleLabel}</div>
              </div>
            )}
            {vehicle?.mileage && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 2 }}>Mileage</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{vehicle.mileage.toLocaleString()} mi</div>
              </div>
            )}
          </div>
        </div>

        {/* Summary row */}
        {savedItems.length > 0 && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            {counts.critical > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c' }}>
                ● {counts.critical} Critical
              </span>
            )}
            {counts.warning > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309' }}>
                ● {counts.warning} Warning
              </span>
            )}
            {counts.ok > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>
                ● {counts.ok} OK
              </span>
            )}
          </div>
        )}

        {/* Sections */}
        {sections.map(section => (
          <div key={section.section_name} className="section-card" style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em',
              color: '#374151', borderBottom: '1.5px solid #d1d5db', paddingBottom: 4, marginBottom: 8,
            }}>
              {section.section_name}
            </div>

            {section.items.map(({ templateItem, savedItem, photos: itemPhotos }, idx) => {
              const status   = savedItem?.result ?? null
              const rawTitle = templateItem?.label || templateItem?.item_name || ''
              const finding  = savedItem?.note?.trim()
              const title    = rawTitle && rawTitle !== 'Inspection Item'
                ? rawTitle
                : finding || 'Inspection Item'
              const isLast   = idx === section.items.length - 1
              return (
                <div
                  key={templateItem.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '7px 0',
                    borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{title}</div>
                    {finding && title !== finding && (
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{finding}</div>
                    )}
                    {itemPhotos.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {itemPhotos.map(photo => {
                          if (!photo.image_url) return null
                          return (
                            <img
                              key={photo.id}
                              src={photo.image_url}
                              alt="Inspection photo"
                              style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 4, border: '1px solid #e5e7eb' }}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{
                    flexShrink: 0, fontSize: 11, fontWeight: 700,
                    padding: '2px 8px', border: `1px solid ${statusColor(status)}`,
                    borderRadius: 12, color: statusColor(status), whiteSpace: 'nowrap',
                  }}>
                    {statusLabel(status)}
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {sections.length === 0 && (
          <p style={{ color: '#6b7280', fontSize: 14 }}>No inspection items found.</p>
        )}
      </div>
    </>
  )
}
