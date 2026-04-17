import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import { getInvoicesForTenant } from '@/lib/queries'
import { createAdminClient } from '@/lib/supabase/server'
import Topbar from '@/components/dashboard/Topbar'
import InvoicesList from './InvoicesList'

export const metadata = { title: 'Invoices' }

// ── Resolved row shape passed to the client component ────────────────────────
export type InvoiceListRow = {
  id:             string
  invoice_number: string | null
  status:         string
  payment_status: string   // 'unpaid' | 'partially_paid' | 'paid'
  total:          number
  amount_paid:    number
  balance_due:    number
  created_at:     string
  customerName:   string | null
  vehicleLabel:   string | null
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
  const resolvedRows: InvoiceListRow[] = rawRows.map(row => {
    // Defensive normalisation: if the legacy status field says 'paid' but the
    // payment tracking fields were never backfilled (failed migration), force
    // consistency so the UI is never misleading.
    const paymentStatus =
      row.status === 'paid' && (row.payment_status ?? 'unpaid') === 'unpaid'
        ? 'paid'
        : (row.payment_status ?? 'unpaid')
    const amountPaid =
      row.status === 'paid' && Number(row.amount_paid ?? 0) === 0
        ? row.total
        : Number(row.amount_paid ?? 0)
    const balanceDue =
      row.status === 'paid' && Number(row.balance_due ?? row.total) === row.total
        ? 0
        : Number(row.balance_due ?? row.total)

    return {
      id:             row.id,
      invoice_number: row.invoice_number,
      status:         row.status,
      payment_status: paymentStatus,
      total:          row.total,
      amount_paid:    amountPaid,
      balance_due:    balanceDue,
      created_at:     row.created_at,
      customerName:   row.customer_id ? customerMap.get(row.customer_id) ?? null : null,
      vehicleLabel:   row.vehicle_id ? vehicleMap.get(row.vehicle_id) ?? null : null,
    }
  })

  return (
    <>
      <Topbar
        title="Invoices"
        subtitle="Track balances, record payments, and print customer copies"
      />
      <InvoicesList invoices={resolvedRows} />
    </>
  )
}
