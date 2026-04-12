/**
 * Public customer-facing inspection report page.
 * Route: /i/[id]
 *
 * No authentication required. The inspection UUID is the access token.
 * Data is fetched using the service-role admin client (bypasses RLS).
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { ReportActions } from './ReportActions'

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
    case 'pass':      return '#16a34a'
    case 'attention': return '#d97706'
    case 'urgent':    return '#dc2626'
    default:          return '#9ca3af'
  }
}

function statusBg(status: string | null): string {
  switch (status) {
    case 'pass':      return '#f0fdf4'
    case 'attention': return '#fffbeb'
    case 'urgent':    return '#fef2f2'
    default:          return '#f9fafb'
  }
}

// ── Section grouping ───────────────────────────────────────────────────────────

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

    const savedItem = savedByTemplateId.get(ti.id) ?? null
    const itemPhotos = savedItem ? (photosByItemId.get(savedItem.id) ?? []) : []
    if (savedItem) {
      console.log('[PHOTO MATCH]', {
        itemId:      savedItem.id,
        photosFound: itemPhotos.length,
      })
    }

    sectionMap.get(key)!.items.push({ templateItem: ti, savedItem, photos: itemPhotos })
  }

  // Fallback: if template items are missing (template_id null or template has no rows),
  // render saved inspection items directly so the page is never empty.
  const templateItemById = new Map<string, TemplateItem>()
  for (const ti of templateItems) templateItemById.set(ti.id, ti)

  const coveredTemplateIds = new Set(templateItems.map(ti => ti.id))
  for (const si of savedItems) {
    if (si.template_item_id && coveredTemplateIds.has(si.template_item_id)) continue
    const key = 'General'
    if (!sectionMap.has(key)) sectionMap.set(key, { section_name: key, items: [] })
    const itemPhotos = photosByItemId.get(si.id) ?? []
    const matchedTemplate = si.template_item_id ? templateItemById.get(si.template_item_id) : undefined
        const label = matchedTemplate?.label || matchedTemplate?.item_name || si.note?.trim() || 'Inspection Item'
    sectionMap.get(key)!.items.push({
      templateItem: { id: si.template_item_id ?? si.id, section_name: key, label, sort_order: 0 },
      savedItem: si,
      photos: itemPhotos,
    })
  }

  const severityRank: Record<string, number> = {
    urgent:      0,
    attention:   1,
    pass:        2,
    not_checked: 3,
  }

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
    .select('created_at, tenant_id')
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

export default async function PublicInspectionReportPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient()

  // ── 1. Load inspection header ─────────────────────────────────────────────
  const { data: inspection } = await supabase
    .from('inspections')
    .select('id, tenant_id, customer_id, vehicle_id, template_id, status, notes, completed_at, created_at')
    .eq('id', params.id)
    .maybeSingle()

  if (!inspection) return notFound()

  // ── 2. Load saved items, customer, vehicle in parallel ───────────────────
  const [
    savedItemsRes,
    customerRes,
    vehicleRes,
  ] = await Promise.all([
    supabase
      .from('inspection_items')
      .select('id, template_item_id, result, note')
      .eq('inspection_id', params.id),
    inspection.customer_id
      ? supabase
          .from('customers')
          .select('first_name, last_name')
          .eq('id', inspection.customer_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    inspection.vehicle_id
      ? supabase
          .from('vehicles')
          .select('year, make, model, trim, color, mileage, license_plate')
          .eq('id', inspection.vehicle_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const savedItems = (savedItemsRes.data ?? []) as SavedItem[]
  const customer   = customerRes.data as { first_name: string; last_name: string } | null
  const vehicle    = vehicleRes.data  as { year: number | null; make: string | null; model: string | null; trim: string | null; color: string | null; mileage: number | null; license_plate: string | null } | null

  // ── 2b. Load template items separately so errors are visible ─────────────
  const templateItems = inspection.template_id
    ? await supabase
        .from('inspection_template_items')
        .select('*')
        .eq('template_id', inspection.template_id)
        .order('sort_order', { ascending: true })
        .then(({ data }) => data ?? [])
    : []

  console.log('[PUBLIC INSPECTION]', {
    inspectionId:       inspection.id,
    templateId:         inspection.template_id,
    templateItemsCount: templateItems.length,
  })

  // ── 3. Load photos for all saved item ids ────────────────────────────────
  console.log('[PHOTO FETCH INPUT]', {
    savedItemsLength: savedItems.length,
    ids: savedItems.map(i => i.id),
  })

  const { data: photosData } = savedItems.length === 0
    ? { data: [] }
    : await supabase
        .from('inspection_item_photos')
        .select('id, inspection_item_id, image_url')
        .in('inspection_item_id', savedItems.map(si => si.id))

  const photos: Photo[] = (photosData ?? []) as Photo[]

  // ── 4. Group and count ───────────────────────────────────────────────────
  const sections = groupSections(templateItems, savedItems, photos)

  const counts = { ok: 0, warning: 0, critical: 0, notChecked: 0 }
  for (const si of savedItems) {
      if (si.result === 'pass')        counts.ok++
      else if (si.result === 'attention') counts.warning++
      else if (si.result === 'urgent')    counts.critical++
    else                                counts.notChecked++
  }

  // ── 5. Derived display values ────────────────────────────────────────────
  const customerName = customer
    ? `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim() || null
    : null

  const vehicleLabel = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(' ') || null
    : null

  const inspectionDate = inspection.completed_at ?? inspection.created_at
  const dateDisplay = inspectionDate
    ? new Date(inspectionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  // ── 6. Render ────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#111827',
    }}>

      {/* Header */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '24px 20px 20px',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 6 }}>
                Vehicle Inspection Report
              </div>
              {dateDisplay && (
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                  {dateDisplay}
                </div>
              )}
              {(customerName || vehicleLabel) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
                  {customerName && (
                    <div>
                      <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Customer</div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{customerName}</div>
                    </div>
                  )}
                  {vehicleLabel && (
                    <div>
                      <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Vehicle</div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{vehicleLabel}</div>
                    </div>
                  )}
                  {vehicle?.mileage && (
                    <div>
                      <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Mileage</div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{vehicle.mileage.toLocaleString()} mi</div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <ReportActions inspectionId={inspection.id} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 20px 48px' }}>

        {/* Summary counts */}
        {savedItems.length > 0 && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 10,
            marginBottom: 24,
            padding: '16px 20px',
            background: '#fff',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
          }}>
            {counts.critical > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#fef2f2', borderRadius: 20 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>{counts.critical} Critical</span>
              </div>
            )}
            {counts.warning > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#fffbeb', borderRadius: 20 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#d97706' }}>{counts.warning} Warning</span>
              </div>
            )}
            {counts.ok > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#f0fdf4', borderRadius: 20 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>{counts.ok} OK</span>
              </div>
            )}
          </div>
        )}

        {/* Sections */}
        {sections.map(section => (
          <div key={section.section_name} style={{
            marginBottom: 16,
            background: '#fff',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}>
            {/* Section header */}
            <div style={{
              padding: '10px 16px',
              borderBottom: '1px solid #f3f4f6',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: '#6b7280',
              background: '#f9fafb',
            }}>
              {section.section_name}
            </div>

            {/* Items */}
            {section.items.map(({ templateItem, savedItem, photos: itemPhotos }, idx) => {
              console.log('[PHOTOS DEBUG]', {
                savedItemId: savedItem?.id,
                photos:      itemPhotos.length,
              })
              const isLast = idx === section.items.length - 1
              const status  = savedItem?.result ?? null
              const rawTitle = templateItem?.label || templateItem?.item_name || ''
              const finding  = savedItem?.note?.trim()
              const title    = rawTitle && rawTitle !== 'Inspection Item'
                ? rawTitle
                : finding || 'Inspection Item'
              return (
                <div
                  key={templateItem.id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
                    background: statusBg(status),
                  }}
                >
                  {/* Item row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                        {title}
                      </div>
                      {finding && (
                        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.4 }}>
                          {finding}
                        </div>
                      )}
                    </div>
                    <div style={{
                      flexShrink: 0,
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 20,
                      color: statusColor(status),
                      background: '#fff',
                      border: `1px solid ${statusColor(status)}`,
                      whiteSpace: 'nowrap',
                    }}>
                      {statusLabel(status)}
                    </div>
                  </div>

                  {/* Photos */}
                  {itemPhotos.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                      {itemPhotos.map(photo => {
                        if (!photo.image_url) return null
                        return (
                          <div
                            key={photo.id}
                            style={{
                              width: 80, height: 80,
                              minWidth: 80, minHeight: 80,
                              maxWidth: 80, maxHeight: 80,
                              overflow: 'hidden',
                              borderRadius: 8,
                              border: '1px solid #e5e7eb',
                              flexShrink: 0,
                              display: 'block',
                            }}
                          >
                            <img
                              src={photo.image_url}
                              alt="Inspection photo"
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* Empty state */}
        {sections.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb',
            color: '#6b7280', fontSize: 14,
          }}>
            No inspection items found.
          </div>
        )}

      </div>
    </div>
  )
}
