import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import {
  getVehicleById,
  getAppointmentsForVehicle,
  getInspectionsForVehicle,
  getEstimatesForVehicle,
  getWorkOrdersForVehicle,
  getInvoicesForVehicle,
  getWorkOrderLinePreviews,
} from '@/lib/queries'
import type { Estimate, Inspection, Invoice, WorkOrder } from '@/lib/types'
import Topbar from '@/components/dashboard/Topbar'
import VehicleServiceHistory from './VehicleServiceHistory'

export const metadata = { title: 'Vehicle Details' }

type RelatedLink = { label: string; href: string }

type VehicleIntelligenceSummary = {
  totalRevenue: number
  totalVisits: number
  invoiceCount: number
  averageTicket: number | null
  lastVisit: string | null
  /** Most recent work order line preview or latest invoice line. */
  recentWorkPerformed: string | null
}

/** Serializable snapshot for Current Job card (work order is anchor when present). */
type CurrentJobSnapshot = {
  stageLabel: string
  vehicleLabel: string
  lastActivityAt: string | null
  links: {
    inspection: { href: string; label: string } | null
    estimate: { href: string; label: string } | null
    workOrder: { href: string; label: string } | null
    invoice: { href: string; label: string } | null
  }
}

function timestamp(iso: string | null | undefined): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : 0
}

function openWorkOrderRank(status: WorkOrder['status']): number {
  if (status === 'in_progress') return 0
  if (status === 'ready') return 1
  if (status === 'draft') return 2
  return 99
}

function pickCurrentWorkOrder(workOrders: WorkOrder[]): WorkOrder | null {
  const open = workOrders.filter(w =>
    w.status === 'in_progress' || w.status === 'ready' || w.status === 'draft',
  )
  if (open.length > 0) {
    return [...open].sort((a, b) => {
      const ra = openWorkOrderRank(a.status)
      const rb = openWorkOrderRank(b.status)
      if (ra !== rb) return ra - rb
      return timestamp(b.updated_at) - timestamp(a.updated_at)
    })[0]
  }
  const closed = workOrders.filter(w => w.status === 'completed' || w.status === 'invoiced')
  if (closed.length === 0) return null
  return [...closed].sort((a, b) => timestamp(b.updated_at) - timestamp(a.updated_at))[0]
}

function invoiceForWorkOrder(wo: WorkOrder, invoices: Invoice[]): Invoice | null {
  if (wo.invoice_id) {
    const byId = invoices.find(i => i.id === wo.invoice_id)
    if (byId) return byId
  }
  return invoices.find(i => i.work_order_id === wo.id) ?? null
}

function isInvoicePaid(inv: Invoice): boolean {
  return inv.payment_status === 'paid' || inv.status === 'paid'
}

function buildCurrentJobSnapshot(
  vehicleLabel: string,
  workOrders: WorkOrder[],
  estimates: Estimate[],
  inspections: Inspection[],
  invoices: Invoice[],
): CurrentJobSnapshot {
  const emptyLinks: CurrentJobSnapshot['links'] = {
    inspection: null,
    estimate: null,
    workOrder: null,
    invoice: null,
  }

  const wo = pickCurrentWorkOrder(workOrders)

  const maxIsoFromRows = (rows: ({ updated_at?: string; created_at?: string } | null | undefined)[]) => {
    let m = 0
    for (const r of rows) {
      if (!r) continue
      m = Math.max(m, timestamp(r.updated_at), timestamp(r.created_at))
    }
    return m > 0 ? new Date(m).toISOString() : null
  }

  if (wo) {
    const linkedEstimate = estimates.find(e => e.id === wo.estimate_id) ?? null
    const linkedInspection = wo.inspection_id
      ? inspections.find(i => i.id === wo.inspection_id) ?? null
      : null
    const linkedInvoice = invoiceForWorkOrder(wo, invoices)

    let stageLabel = 'No active job'
    if (wo.status === 'in_progress') stageLabel = 'Work in progress'
    else if (wo.status === 'ready') stageLabel = 'Ready for work'
    else if (wo.status === 'draft') stageLabel = 'Work order draft'
    else if (wo.status === 'completed' || wo.status === 'invoiced') {
      const inv = linkedInvoice && linkedInvoice.status !== 'void' ? linkedInvoice : null
      if (!inv) {
        stageLabel =
          wo.status === 'completed' ? 'Work complete — not invoiced' : 'Payment due'
      } else if (isInvoicePaid(inv)) {
        stageLabel = 'Job closed'
      } else {
        stageLabel = 'Payment due'
      }
    }

    const lastActivityAt = maxIsoFromRows([wo, linkedEstimate, linkedInspection, linkedInvoice])

    return {
      stageLabel,
      vehicleLabel,
      lastActivityAt,
      links: {
        inspection: linkedInspection
          ? {
              href: `/dashboard/inspections/${linkedInspection.id}`,
              label: 'Inspection',
            }
          : null,
        estimate: linkedEstimate
          ? {
              href: `/dashboard/estimates/${linkedEstimate.id}`,
              label: linkedEstimate.estimate_number
                ? `Estimate #${linkedEstimate.estimate_number}`
                : 'Estimate',
            }
          : null,
        workOrder: {
          href: `/dashboard/work-orders/${wo.id}`,
          label: wo.work_order_number ? `Work order #${wo.work_order_number}` : 'Work order',
        },
        invoice:
          linkedInvoice && linkedInvoice.status !== 'void'
            ? {
                href: `/dashboard/invoices/${linkedInvoice.id}`,
                label: linkedInvoice.invoice_number
                  ? `Invoice #${linkedInvoice.invoice_number}`
                  : 'Invoice',
              }
            : null,
      },
    }
  }

  const openInspections = inspections.filter(
    i => i.status === 'in_progress' || i.status === 'draft',
  )
  const pendingEstimates = estimates.filter(e => e.status !== 'declined')
  const topInsp =
    openInspections.length > 0
      ? [...openInspections].sort((a, b) => timestamp(b.updated_at) - timestamp(a.updated_at))[0]
      : null
  const topEst =
    pendingEstimates.length > 0
      ? [...pendingEstimates].sort((a, b) => timestamp(b.updated_at) - timestamp(a.updated_at))[0]
      : null

  let stageLabel = 'No active job'
  let lastActivityAt: string | null = null
  const links = { ...emptyLinks }

  if (topInsp && (!topEst || timestamp(topInsp.updated_at) >= timestamp(topEst.updated_at))) {
    stageLabel = 'Inspection in progress'
    lastActivityAt = maxIsoFromRows([topInsp])
    links.inspection = {
      href: `/dashboard/inspections/${topInsp.id}`,
      label: 'Inspection',
    }
  } else if (topEst) {
    stageLabel = 'Estimate pending'
    lastActivityAt = maxIsoFromRows([topEst])
    links.estimate = {
      href: `/dashboard/estimates/${topEst.id}`,
      label: topEst.estimate_number ? `Estimate #${topEst.estimate_number}` : 'Estimate',
    }
  }

  return { stageLabel, vehicleLabel, lastActivityAt, links }
}

export default async function VehicleDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getDashboardTenant()
  if (!ctx) return notFound()

  const tenantId = ctx.tenant.id
  const vehicleId = params.id

  // Fetch vehicle
  const vehicle = await getVehicleById(tenantId, vehicleId)
  if (!vehicle) return notFound()

  // Fetch all service history records in parallel
  const [appointments, inspections, estimates, workOrders, invoices] = await Promise.all([
    getAppointmentsForVehicle(tenantId, vehicleId),
    getInspectionsForVehicle(tenantId, vehicleId),
    getEstimatesForVehicle(tenantId, vehicleId),
    getWorkOrdersForVehicle(tenantId, vehicleId),
    getInvoicesForVehicle(tenantId, vehicleId),
  ])

  const woLinePreviews = await getWorkOrderLinePreviews(
    tenantId,
    workOrders.map(w => w.id),
  )

  // ── Compute Vehicle Intelligence Summary ──────────────────────────────────
  const billableInvoices = invoices.filter(i => i.status !== 'void')
  const totalRevenue = billableInvoices.reduce((sum, i) => sum + Number(i.total), 0)
  const invoiceCount = billableInvoices.length

  const visitWorkOrders = workOrders.filter(
    w => w.status === 'completed' || w.status === 'invoiced',
  )
  const totalVisits = visitWorkOrders.length

  const averageTicket = invoiceCount > 0 ? totalRevenue / invoiceCount : null

  let lastVisitTs = 0
  for (const w of visitWorkOrders) {
    lastVisitTs = Math.max(lastVisitTs, timestamp(w.completed_at))
  }
  for (const i of billableInvoices) {
    lastVisitTs = Math.max(lastVisitTs, timestamp(i.created_at))
  }
  const lastVisit = lastVisitTs > 0 ? new Date(lastVisitTs).toISOString() : null

  const woByCompleted = [...workOrders].sort(
    (a, b) => timestamp(b.completed_at ?? b.created_at) - timestamp(a.completed_at ?? a.created_at),
  )
  const topWo = woByCompleted[0]
  let recentWorkPerformed: string | null = null
  if (topWo) {
    const preview = woLinePreviews.get(topWo.id)
    const label = topWo.work_order_number ? `Work order #${topWo.work_order_number}` : 'Work order'
    recentWorkPerformed = preview ? `${label}: ${preview}` : label
  } else if (billableInvoices.length > 0) {
    const inv = billableInvoices.sort(
      (a, b) => timestamp(b.created_at) - timestamp(a.created_at),
    )[0]
    recentWorkPerformed = inv.invoice_number
      ? `Invoice #${inv.invoice_number} · $${Number(inv.total).toFixed(2)}`
      : `$${Number(inv.total).toFixed(2)}`
  }

  const summary: VehicleIntelligenceSummary = {
    totalRevenue,
    totalVisits,
    invoiceCount,
    averageTicket,
    lastVisit,
    recentWorkPerformed,
  }

  // Build unified timeline
  type TimelineEntry = {
    id: string
    recordType: 'appointment' | 'inspection' | 'estimate' | 'work_order' | 'invoice'
    date: Date
    dateString: string
    status: string
    paymentStatus?: string
    title: string
    summary?: string
    /** Work performed (e.g. WO line titles). */
    workPerformed?: string
    detailUrl: string
    recordNumber?: string
    relatedLinks?: RelatedLink[]
    /**
     * Explicit job thread only: same prefix + work order id when FK chain exists.
     * Not inferred from dates.
     */
    visitGroupId?: string
  }

  const jobVisitGroupId = (workOrderId: string) => `job:${workOrderId}`

  const workOrderIdForInspection = (inspectionId: string) => {
    const row = inspections.find(ins => ins.id === inspectionId)
    if (!row) return undefined
    if (row.work_order_id) return row.work_order_id
    return workOrders.find(w => w.inspection_id === row.id)?.id
  }

  const visitGroupIdForInvoiceRow = (inv: (typeof invoices)[number]) => {
    if (inv.work_order_id) return jobVisitGroupId(inv.work_order_id)
    const wo = workOrders.find(w => w.invoice_id === inv.id)
    return wo ? jobVisitGroupId(wo.id) : undefined
  }

  const entries: TimelineEntry[] = []

  // Add appointments
  appointments.forEach(a => {
    const dateStr = a.appointment_date || a.created_at
    const relatedLinks: RelatedLink[] = []
    const linkedInsp = inspections.find(ins => ins.appointment_id === a.id)
    let visitGroupId: string | undefined
    if (linkedInsp) {
      relatedLinks.push({ label: 'Inspection', href: `/dashboard/inspections/${linkedInsp.id}` })
      const woId = workOrderIdForInspection(linkedInsp.id)
      if (woId) visitGroupId = jobVisitGroupId(woId)
    }
    entries.push({
      id: a.id,
      recordType: 'appointment',
      date: new Date(a.appointment_date ? `${a.appointment_date}T${a.appointment_time || '00:00'}` : a.created_at),
      dateString: dateStr,
      status: a.status,
      title: 'Appointment',
      detailUrl: `/dashboard/appointments/${a.id}/edit`,
      relatedLinks: relatedLinks.length ? relatedLinks : undefined,
      visitGroupId,
    })
  })

  // Add inspections
  inspections.forEach(i => {
    const dateStr = i.completed_at || i.created_at
    const summaryParts: string[] = []
    if (i.total_items != null && i.total_items > 0) summaryParts.push(`${i.total_items} checked`)
    if (i.critical_count != null && i.critical_count > 0) summaryParts.push(`${i.critical_count} urgent`)
    if (i.warning_count != null && i.warning_count > 0) summaryParts.push(`${i.warning_count} attention`)

    const relatedLinks: RelatedLink[] = []
    if (i.appointment_id) {
      relatedLinks.push({
        label: 'Appointment',
        href: `/dashboard/appointments/${i.appointment_id}/edit`,
      })
    }
    const linkedWo = workOrders.find(w => w.inspection_id === i.id)
    if (linkedWo) {
      relatedLinks.push({
        label: linkedWo.work_order_number ? `Work order #${linkedWo.work_order_number}` : 'Work order',
        href: `/dashboard/work-orders/${linkedWo.id}`,
      })
    }

    const woIdForGroup = workOrderIdForInspection(i.id)

    entries.push({
      id: i.id,
      recordType: 'inspection',
      date: new Date(i.completed_at || i.created_at),
      dateString: dateStr,
      status: i.status,
      title: 'Vehicle inspection',
      summary: summaryParts.length ? summaryParts.join(' · ') : undefined,
      detailUrl: `/dashboard/inspections/${i.id}`,
      relatedLinks: relatedLinks.length ? relatedLinks : undefined,
      visitGroupId: woIdForGroup ? jobVisitGroupId(woIdForGroup) : undefined,
    })
  })

  // Add estimates
  estimates.forEach(e => {
    const linkedWo = workOrders.find(w => w.estimate_id === e.id)
    // Hide draft estimates once a work order is linked (same FK as related links); keeps timeline scannable.
    if (e.status === 'draft' && linkedWo) return

    const relatedLinks: RelatedLink[] = []
    if (linkedWo) {
      relatedLinks.push({
        label: linkedWo.work_order_number ? `Work order #${linkedWo.work_order_number}` : 'Work order',
        href: `/dashboard/work-orders/${linkedWo.id}`,
      })
    }
    entries.push({
      id: e.id,
      recordType: 'estimate',
      date: new Date(e.created_at),
      dateString: e.created_at,
      status: e.status,
      title: e.estimate_number ? `Estimate #${e.estimate_number}` : 'Estimate',
      summary: e.total ? `Total $${Number(e.total).toFixed(2)}` : undefined,
      recordNumber: e.estimate_number ?? undefined,
      detailUrl: `/dashboard/estimates/${e.id}`,
      relatedLinks: relatedLinks.length ? relatedLinks : undefined,
      visitGroupId: linkedWo ? jobVisitGroupId(linkedWo.id) : undefined,
    })
  })

  // Add work orders
  workOrders.forEach(w => {
    const relatedLinks: RelatedLink[] = []
    if (w.inspection_id) {
      relatedLinks.push({ label: 'Inspection', href: `/dashboard/inspections/${w.inspection_id}` })
    }
    if (w.estimate_id) {
      relatedLinks.push({
        label: w.estimate_number ? `Estimate #${w.estimate_number}` : 'Estimate',
        href: `/dashboard/estimates/${w.estimate_id}`,
      })
    }
    if (w.invoice_id) {
      relatedLinks.push({ label: 'Invoice', href: `/dashboard/invoices/${w.invoice_id}` })
    }

    const preview = woLinePreviews.get(w.id)

    entries.push({
      id: w.id,
      recordType: 'work_order',
      date: new Date(w.completed_at ?? w.created_at),
      dateString: w.completed_at ?? w.created_at,
      status: w.status,
      title: w.work_order_number ? `Work order #${w.work_order_number}` : 'Work order',
      summary: w.total ? `Total $${Number(w.total).toFixed(2)}` : undefined,
      workPerformed: preview || undefined,
      recordNumber: w.work_order_number ?? undefined,
      detailUrl: `/dashboard/work-orders/${w.id}`,
      relatedLinks: relatedLinks.length ? relatedLinks : undefined,
      visitGroupId: jobVisitGroupId(w.id),
    })
  })

  // Add invoices
  invoices.forEach(i => {
    const relatedLinks: RelatedLink[] = []
    const wid = i.work_order_id
    if (wid) {
      const wo = workOrders.find(x => x.id === wid)
      relatedLinks.push({
        label: wo?.work_order_number ? `Work order #${wo.work_order_number}` : 'Work order',
        href: `/dashboard/work-orders/${wid}`,
      })
    }

    entries.push({
      id: i.id,
      recordType: 'invoice',
      date: new Date(i.created_at),
      dateString: i.created_at,
      status: i.status,
      paymentStatus: i.payment_status,
      title: i.invoice_number ? `Invoice #${i.invoice_number}` : 'Invoice',
      summary: i.total ? `Total $${Number(i.total).toFixed(2)}` : undefined,
      recordNumber: i.invoice_number ?? undefined,
      detailUrl: `/dashboard/invoices/${i.id}`,
      relatedLinks: relatedLinks.length ? relatedLinks : undefined,
      visitGroupId: visitGroupIdForInvoiceRow(i),
    })
  })

  // Sort by date descending (most recent first)
  entries.sort((a, b) => b.date.getTime() - a.date.getTime())

  const vehicleLabel = [vehicle.year, vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(' ') || 'Vehicle'

  const currentJobSnapshot = buildCurrentJobSnapshot(
    vehicleLabel,
    workOrders,
    estimates,
    inspections,
    invoices,
  )

  return (
    <>
      <Topbar title={vehicleLabel} />
      <VehicleServiceHistory
        vehicle={vehicle}
        entries={entries}
        summary={summary}
        currentJobSnapshot={currentJobSnapshot}
      />
    </>
  )
}
