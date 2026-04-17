/**
 * Invoice detail page
 * Route: /dashboard/invoices/[id]
 */

import { notFound } from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import { getInvoiceById, getCustomerName, getVehicleDisplay } from '@/lib/queries'
import { createAdminClient } from '@/lib/supabase/server'
import { canEditDashboardModule } from '@/lib/auth/roles'
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

  const [customerName, vehicleDisplay, paymentsRes, profileRes, tenantNameRes] = await Promise.all([
    invoice.customer_id ? getCustomerName(invoice.customer_id) : Promise.resolve(null),
    invoice.vehicle_id  ? getVehicleDisplay(invoice.vehicle_id)  : Promise.resolve(null),
    supabase
      .from('invoice_payments')
      .select('id, amount, payment_method, paid_at, note, created_at')
      .eq('invoice_id', params.id)
      .eq('tenant_id', tenantId)
      .order('paid_at', { ascending: false }),
    // Columns match dashboard settings upsert (address_line_1 / city / state / zip_code).
    supabase
      .from('business_profiles')
      .select(
        'business_name, phone, email, logo_url, address_line_1, address_line_2, city, state, zip_code',
      )
      .eq('tenant_id', tenantId)
      .maybeSingle(),
    supabase.from('tenants').select('name').eq('id', tenantId).maybeSingle(),
  ])

  const payments = (paymentsRes.data ?? []) as InvoicePayment[]
  const profile = profileRes.data as {
    business_name: string | null
    phone: string | null
    email: string | null
    logo_url: string | null
    address_line_1: string | null
    address_line_2: string | null
    city: string | null
    state: string | null
    zip_code: string | null
  } | null

  const cityStateZip = [profile?.city, profile?.state, profile?.zip_code]
    .filter(Boolean)
    .join(', ')
  const addressLines = [profile?.address_line_1, profile?.address_line_2, cityStateZip || null].filter(
    (line): line is string => !!line && String(line).trim().length > 0,
  )

  const tenantDisplayName =
    tenantNameRes.data?.name?.trim() || ctx.tenant.name?.trim() || ''

  const shopHeader = {
    businessName:
      (profile?.business_name && profile.business_name.trim()) || tenantDisplayName || 'Shop',
    addressLines,
    phone: profile?.phone ?? null,
    email: profile?.email ?? null,
    logoUrl: profile?.logo_url ?? null,
  }

  const canEditInvoices = await canEditDashboardModule('invoices')

  return (
    <>
      <Topbar title={`Invoice ${invoice.invoice_number || invoice.id}`} />
      <div className="dash-content">
        <InvoiceDetail
          invoice={invoice}
          shopHeader={shopHeader}
          customerName={customerName}
          vehicleDisplay={vehicleDisplay}
          payments={payments}
          canRecordPayment={canEditInvoices}
        />
      </div>
    </>
  )
}
