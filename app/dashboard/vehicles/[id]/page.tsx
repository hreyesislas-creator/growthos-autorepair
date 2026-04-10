import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import {
  getVehicleById,
  getAppointmentsForVehicle,
  getInspectionsForVehicle,
  getEstimatesForVehicle,
  getWorkOrdersForVehicle,
  getInvoicesForVehicle,
} from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import VehicleServiceHistory from './VehicleServiceHistory'

export const metadata = { title: 'Vehicle Details' }

type VehicleIntelligenceSummary = {
  totalRevenue: number
  totalVisits: number
  averageTicket: number | null
  lastVisit: string | null
  lastServiceTitle: string | null
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

  // ── Compute Vehicle Intelligence Summary ──────────────────────────────────
  // Total Revenue: sum of non-void invoices
  const billableInvoices = invoices.filter(i => i.status !== 'void')
  const totalRevenue = billableInvoices.reduce((sum, i) => sum + Number(i.total), 0)

  // Total Visits: count of work orders
  const totalVisits = workOrders.length

  // Average Ticket: revenue / visits (or null if no visits)
  const averageTicket = totalVisits > 0 ? totalRevenue / totalVisits : null

  // Last Visit: priority order
  // 1) most recent non-void invoice.created_at
  // 2) else most recent work_order.created_at
  // 3) else most recent inspection (completed_at ?? created_at)
  // 4) else null
  let lastVisit: string | null = null
  if (billableInvoices.length > 0) {
    lastVisit = billableInvoices[0].created_at
  } else if (workOrders.length > 0) {
    lastVisit = workOrders[0].created_at
  } else if (inspections.length > 0) {
    lastVisit = inspections[0].completed_at || inspections[0].created_at
  }

  // Last Service: most recent work order number
  const lastServiceTitle = workOrders.length > 0 && workOrders[0].work_order_number
    ? `Work Order #${workOrders[0].work_order_number}`
    : null

  const summary: VehicleIntelligenceSummary = {
    totalRevenue,
    totalVisits,
    averageTicket,
    lastVisit,
    lastServiceTitle,
  }

  // Build unified timeline
  type TimelineEntry = {
    id: string
    recordType: 'appointment' | 'inspection' | 'estimate' | 'work_order' | 'invoice'
    date: Date
    dateString: string
    status: string
    title: string
    summary?: string
    detailUrl: string
    recordNumber?: string
  }

  const entries: TimelineEntry[] = []

  // Add appointments
  appointments.forEach(a => {
    const dateStr = a.appointment_date || a.created_at
    entries.push({
      id: a.id,
      recordType: 'appointment',
      date: new Date(a.appointment_date ? `${a.appointment_date}T${a.appointment_time || '00:00'}` : a.created_at),
      dateString: dateStr,
      status: a.status,
      title: 'Appointment',
      detailUrl: `/dashboard/appointments/${a.id}/edit`,
    })
  })

  // Add inspections
  inspections.forEach(i => {
    const dateStr = i.completed_at || i.created_at
    entries.push({
      id: i.id,
      recordType: 'inspection',
      date: new Date(i.completed_at || i.created_at),
      dateString: dateStr,
      status: i.status,
      title: 'Vehicle Inspection',
      summary: i.total_items ? `${i.total_items} items` : undefined,
      detailUrl: `/dashboard/inspections/${i.id}`,
    })
  })

  // Add estimates
  estimates.forEach(e => {
    entries.push({
      id: e.id,
      recordType: 'estimate',
      date: new Date(e.created_at),
      dateString: e.created_at,
      status: e.status,
      title: e.estimate_number ? `Estimate #${e.estimate_number}` : 'Estimate',
      summary: e.total ? `$${Number(e.total).toFixed(2)}` : undefined,
      recordNumber: e.estimate_number ?? undefined,
      detailUrl: `/dashboard/estimates/${e.id}`,
    })
  })

  // Add work orders
  workOrders.forEach(w => {
    entries.push({
      id: w.id,
      recordType: 'work_order',
      date: new Date(w.created_at),
      dateString: w.created_at,
      status: w.status,
      title: w.work_order_number ? `Work Order #${w.work_order_number}` : 'Work Order',
      summary: w.total ? `$${Number(w.total).toFixed(2)}` : undefined,
      recordNumber: w.work_order_number ?? undefined,
      detailUrl: `/dashboard/work-orders/${w.id}`,
    })
  })

  // Add invoices
  invoices.forEach(i => {
    entries.push({
      id: i.id,
      recordType: 'invoice',
      date: new Date(i.created_at),
      dateString: i.created_at,
      status: i.status,
      title: i.invoice_number ? `Invoice #${i.invoice_number}` : 'Invoice',
      summary: i.total ? `$${Number(i.total).toFixed(2)}` : undefined,
      recordNumber: i.invoice_number ?? undefined,
      detailUrl: `/dashboard/invoices/${i.id}`,
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
