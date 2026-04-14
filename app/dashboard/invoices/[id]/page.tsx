/**
 * Invoice detail page
 * Route: /dashboard/invoices/[id]
 */

import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import { getInvoiceById, getCustomerName, getVehicleDisplay } from '@/lib/queries'
import { createAdminClient } from '@/lib/supabase/server'
import Topbar from '@/components/dashboard/Topbar'
import InvoiceDetail from './InvoiceDetail'
import type { InvoicePayment } from '@/lib/types'

export const metadata = { title: 'Invoice' }

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const ctx = await getDashboardTenant()
  if (!ctx) return notFound()

  const tenantId = ctx.tenant.id

  const invoice = await getInvoiceById(tenantId, params.id)
  if (!invoice) return notFound()

  const supabase = await createAdminClient()

  const [customerName, vehicleDisplay, paymentsRes] = await Promise.all([
    invoice.customer_id ? getCustomerName(invoice.customer_id) : Promise.resolve(null),
    invoice.vehicle_id  ? getVehicleDisplay(invoice.vehicle_id)  : Promise.resolve(null),
    supabase
      .from('invoice_payments')
      .select('id, amount, payment_method, paid_at, note, created_at')
      .eq('invoice_id', params.id)
      .eq('tenant_id', tenantId)
      .order('paid_at', { ascending: false }),
  ])

  const payments = (paymentsRes.data ?? []) as InvoicePayment[]

  return (
    <>
      <Topbar title={`Invoice ${invoice.invoice_number || invoice.id}`} />
      <div className="dash-content">
        <InvoiceDetail
          invoice={invoice}
          customerName={customerName}
          vehicleDisplay={vehicleDisplay}
          payments={payments}
        />
      </div>
    </>
  )
}
