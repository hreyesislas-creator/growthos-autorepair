import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import { getInvoicesForTenant } from '@/lib/queries'
import { createAdminClient } from '@/lib/supabase/server'
import Topbar from '@/components/dashboard/Topbar'
import InvoicesList from './InvoicesList'

export const metadata = { title: 'Invoices' }

// ── Resolved row shape passed to the client component ────────────────────────
export type InvoiceListRow = {
  id: string
  invoice_number: string | null
  status: string
  total: number
  created_at: string
  customerName: string | null
  vehicleLabel: string | null
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function InvoicesPage() {
  const ctx = await getDashboardTenant()
  if (!ctx) return notFound()

  const tenantId = ctx.tenant.id

  // ── Step 1: Fetch invoices ────────────────────────────────────────────────
  const rawRows = await getInvoicesForTenant(tenantId)

  // ── Step 2: Collect unique customer and vehicle IDs ───────────────────────
  const customerIds = [...new Set(
    rawRows.map(r => r.customer_id).filter((id): id is string => !!id),
  )]
  const vehicleIds = [...new Set(
    rawRows.map(r => r.vehicle_id).filter((id): id is string => !!id),
  )]

  // ── Step 3: Bulk-fetch customers and vehicles ─────────────────────────────
  const supabase = await createAdminClient()

  const [customersRes, vehiclesRes] = await Promise.all([
    customerIds.length > 0
      ? supabase
          .from('customers')
          .select('id, first_name, last_name')
          .in('id', customerIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string }[], error: null }),
    vehicleIds.length > 0
      ? supabase
          .from('vehicles')
          .select('id, year, make, model')
          .in('id', vehicleIds)
      : Promise.resolve({ data: [] as { id: string; year: number | null; make: string | null; model: string | null }[], error: null }),
  ])

  // ── Step 4: Build lookup maps ─────────────────────────────────────────────
  const customerMap = new Map(
    (customersRes.data ?? []).map(c => [c.id, `${c.first_name} ${c.last_name}`.trim()])
  )
  const vehicleMap = new Map(
    (vehiclesRes.data ?? []).map(v => [v.id, [v.year, v.make, v.model].filter(Boolean).join(' ')])
  )

  // ── Step 5: Resolve customer and vehicle names ────────────────────────────
  const resolvedRows: InvoiceListRow[] = rawRows.map(row => ({
    id: row.id,
    invoice_number: row.invoice_number,
    status: row.status,
    total: row.total,
    created_at: row.created_at,
    customerName: row.customer_id ? customerMap.get(row.customer_id) ?? null : null,
    vehicleLabel: row.vehicle_id ? vehicleMap.get(row.vehicle_id) ?? null : null,
  }))

  return (
    <>
      <Topbar title="Invoices" />
      <InvoicesList invoices={resolvedRows} />
    </>
  )
}
