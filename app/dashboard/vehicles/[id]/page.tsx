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
import Topbar from '@/components/dashboard/Topbar'
import VehicleServiceHistory from './VehicleServiceHistory'

export const metadata = { title: 'Vehicle Details' }

type RelatedLink = { label: string; href: string }

type VehicleIntelligenceSummary = {
  totalRevenue: number
  totalVisits: number
  invoiceCount: number
  averageTicket: number | null
  /** How average ticket was computed (for UI caption). */
  averageTicketBasis: 'invoice' | 'work_order' | null
  lastVisit: string | null
  /** Most recent work order line preview or latest invoice line. */
  recentWorkPerformed: string | null
}

function timestamp(iso: string | null | undefined): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : 0
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
  const totalVisits = workOrders.length

  const averageTicketBasis: VehicleIntelligenceSummary['averageTicketBasis'] =
    invoiceCount > 0 ? 'invoice' : totalVisits > 0 ? 'work_order' : null
  const averageTicket =
    averageTicketBasis === 'invoice'
      ? totalRevenue / invoiceCount
      : averageTicketBasis === 'work_order'
        ? totalRevenue / totalVisits
        : null

  let lastVisitTs = 0
  for (const i of billableInvoices) {
    lastVisitTs = Math.max(lastVisitTs, timestamp(i.created_at))
  }
  for (const w of workOrders) {
    lastVisitTs = Math.max(lastVisitTs, timestamp(w.completed_at ?? w.created_at))
  }
  for (const i of inspections) {
    lastVisitTs = Math.max(lastVisitTs, timestamp(i.completed_at ?? i.created_at))
  }
  for (const a of appointments) {
    const d = a.appointment_date
      ? `${a.appointment_date}T${a.appointment_time || '12:00'}`
      : a.created_at
    lastVisitTs = Math.max(lastVisitTs, timestamp(d))
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
    averageTicketBasis,
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
  }

  const entries: TimelineEntry[] = []

  // Add appointments
  appointments.forEach(a => {
    const dateStr = a.appointment_date || a.created_at
    const relatedLinks: RelatedLink[] = []
    const linkedInsp = inspections.find(ins => ins.appointment_id === a.id)
    if (linkedInsp) {
      relatedLinks.push({ label: 'Inspection', href: `/dashboard/inspections/${linkedInsp.id}` })
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
    })
  })

  // Add estimates
  estimates.forEach(e => {
    const relatedLinks: RelatedLink[] = []
    const linkedWo = workOrders.find(w => w.estimate_id === e.id)
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
    })
  })

  // Sort by date descending (most recent first)
  entries.sort((a, b) => b.date.getTime() - a.date.getTime())

  const vehicleLabel = [vehicle.year, vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(' ') || 'Vehicle'

  return (
    <>
      <Topbar title={vehicleLabel} />
      <VehicleServiceHistory vehicle={vehicle} entries={entries} summary={summary} />
    </>
  )
}
