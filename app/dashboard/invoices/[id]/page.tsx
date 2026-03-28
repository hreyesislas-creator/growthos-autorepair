/**
 * Invoice detail page
 * Route: /dashboard/invoices/[id]
 */

import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import { getInvoiceById } from '@/lib/queries'
import Topbar from '@/components/dashboard/Topbar'
import InvoiceDetail from './InvoiceDetail'

export const metadata = { title: 'Invoice' }

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const ctx = await getDashboardTenant()
  const tenantId = ctx?.tenant.id ?? ''

  const invoice = await getInvoiceById(tenantId, params.id)
  if (!invoice) {
    return notFound()
  }

  return (
    <>
      <Topbar title={`Invoice ${invoice.invoice_number || invoice.id}`} />
      <div className="dash-content">
        <InvoiceDetail invoice={invoice} />
      </div>
    </>
  )
}
