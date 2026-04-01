/**
 * Printable invoice page
 * Route: /invoices/[id]/print
 *
 * Renders a clean, printer-friendly version of the invoice
 * suitable for physical archival and customer delivery.
 *
 * Note: This is a top-level route (not under /dashboard) to avoid
 * inheriting the dashboard sidebar/layout.
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import './styles.css'

// Local type for invoice row (matches selected fields in this page)
interface InvoiceData {
  id: string
  tenant_id: string
  customer_id: string | null
  vehicle_id: string | null
  invoice_number: string
  status: string
  subtotal_labor: number | string
  subtotal_parts: number | string
  subtotal_other: number | string
  subtotal: number | string
  tax_rate: number | string | null
  tax_amount: number | string
  total: number | string
  notes: string | null
  created_at: string
  work_order_id: string | null
}

// Local type for business_profiles shape (matches selected fields in this page)
interface BusinessProfileData {
  business_name: string | null
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  phone: string | null
  email: string | null
  website: string | null
  logo_url: string | null
  bar_license: string | null
  seller_permit: string | null
  warranty_text: string | null
  invoice_terms: string | null
  invoice_footer: string | null
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number, tenant_id')
    .eq('id', params.id)
    .maybeSingle()

  if (!data) return { title: 'Invoice' }

  return {
    title: `Print Invoice ${data.invoice_number}`,
    robots: { index: false, follow: false },
  }
}

export default async function InvoicePrintPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createAdminClient()

  // DIAGNOSTIC LOG
  console.log('[print/page.tsx] params.id:', params.id)

  // ── 1. Fetch invoice header ────────────────────────────────────────────
  const invoiceRes = await supabase
    .from('invoices')
    .select(
      'id, tenant_id, customer_id, vehicle_id, invoice_number, status, ' +
      'subtotal_labor, subtotal_parts, subtotal_other, subtotal, ' +
      'tax_rate, tax_amount, total, notes, created_at, work_order_id',
    )
    .eq('id', params.id)
    .maybeSingle()

  console.log('[print/page.tsx] invoiceRes.data:', invoiceRes.data)
  console.log('[print/page.tsx] invoiceRes.error:', invoiceRes.error)

  const invoice = invoiceRes.data as InvoiceData | null
  if (!invoice) {
    console.log('[print/page.tsx] NOTFOUND: invoice not found')
    return notFound()
  }

  const tenantId = invoice.tenant_id
  console.log('[print/page.tsx] tenantId:', tenantId)

  // ── 2. Fetch related data using invoice's FKs ─────────────────────────
  const [itemsRes, customerRes, vehicleRes, tenantRes, profileRes] =
    await Promise.all([
      supabase
        .from('invoice_items')
        .select(
          'id, title, description, labor_hours, labor_rate, labor_total, parts_total, line_total, display_order',
        )
        .eq('invoice_id', params.id)
        .order('display_order'),

      // Customer - FILTER by invoice's customer_id
      invoice.customer_id
        ? supabase
            .from('customers')
            .select('first_name, last_name, phone, email')
            .eq('id', invoice.customer_id)
            .single()
        : Promise.resolve({ data: null }),

      // Vehicle - FILTER by invoice's vehicle_id
      invoice.vehicle_id
        ? supabase
            .from('vehicles')
            .select('year, make, model, license_plate')
            .eq('id', invoice.vehicle_id)
            .single()
        : Promise.resolve({ data: null }),

      // Tenant - for shop name and contact info
      supabase
        .from('tenants')
        .select('id, name')
        .eq('id', tenantId)
        .single(),

      // Business profile - FILTER by tenant_id (tenant-scoped)
      supabase
        .from('business_profiles')
        .select(
          'business_name, address_line_1, address_line_2, city, state, zip_code, ' +
          'phone, email, website, logo_url, bar_license, seller_permit, ' +
          'warranty_text, invoice_terms, invoice_footer',
        )
        .eq('tenant_id', tenantId)
        .maybeSingle(),
    ])

  console.log('[print/page.tsx] itemsRes.data count:', itemsRes.data?.length ?? 0)
  console.log('[print/page.tsx] customerRes.data:', customerRes.data)
  console.log('[print/page.tsx] vehicleRes.data:', vehicleRes.data)
  console.log('[print/page.tsx] tenantRes.data:', tenantRes.data)
  console.log('[print/page.tsx] tenantRes.error:', tenantRes.error)
  console.log('[print/page.tsx] profileRes.data:', profileRes.data)

  const items = itemsRes.data ?? []
  const customer = customerRes.data
  const vehicle = vehicleRes.data
  const tenant = tenantRes.data
  const profile = profileRes.data as BusinessProfileData | null

  // Build customer name
  const customerName = customer
    ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
    : '—'

  // Build vehicle display
  const vehicleDisplay = vehicle
    ? `${vehicle.year ?? ''} ${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim()
    : '—'

  // Normalize numeric fields (typed as string | number) for formatting
  const subtotalLabor = Number(invoice.subtotal_labor ?? 0)
  const subtotalParts = Number(invoice.subtotal_parts ?? 0)
  const subtotalOther = Number(invoice.subtotal_other ?? 0)
  const subtotal = Number(invoice.subtotal ?? 0)
  const taxRate = Number(invoice.tax_rate ?? 0)
  const taxAmount = Number(invoice.tax_amount ?? 0)
  const total = Number(invoice.total ?? 0)

  return (
    <div className="page">
      {/* Header */}
      <div className="header">
        <div className="shop-info">
          <h1>{profile?.business_name ?? tenant?.name ?? 'Auto Shop'}</h1>
          {/* Address block */}
          {(profile?.address_line_1 || profile?.city || profile?.state) && (
            <div style={{ fontSize: '11px', color: '#555', marginTop: '8px', lineHeight: '1.4' }}>
              {profile?.address_line_1 && <p>{profile.address_line_1}</p>}
              {profile?.address_line_2 && <p>{profile.address_line_2}</p>}
              {(profile?.city || profile?.state || profile?.zip_code) && (
                <p>
                  {[profile?.city, profile?.state, profile?.zip_code]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
            </div>
          )}
          {/* Contact info */}
          {(profile?.phone || profile?.email || profile?.website) && (
            <div style={{ fontSize: '11px', color: '#666', marginTop: '6px', lineHeight: '1.4' }}>
              {profile?.phone && <p>Phone: {profile.phone}</p>}
              {profile?.email && <p>Email: {profile.email}</p>}
              {profile?.website && <p>Web: {profile.website}</p>}
            </div>
          )}
        </div>
        <div className="invoice-meta">
          <h2>Invoice #{invoice.invoice_number || invoice.id.substring(0, 8)}</h2>
          <p>
            {new Date(invoice.created_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Customer & Vehicle info */}
      <div className="customer-vehicle">
        <div>
          <strong>Bill To:</strong>
          <p>{customerName}</p>
        </div>
        <div>
          <strong>Vehicle:</strong>
          <p>{vehicleDisplay}</p>
        </div>
        {invoice.work_order_id && (
          <div>
            <strong>Work Order:</strong>
            <p>WO-{invoice.work_order_id.substring(0, 8)}…</p>
          </div>
        )}
      </div>

      {/* Line items table */}
      {items.length > 0 ? (
        <table className="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th className="number">Labor</th>
              <th className="number">Parts</th>
              <th className="number">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>
                  <strong>{item.title}</strong>
                  {item.description && <p style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{item.description}</p>}
                </td>
                <td className="number">
                  {item.labor_total > 0 ? `$${item.labor_total.toFixed(2)}` : '—'}
                </td>
                <td className="number">
                  {item.parts_total > 0 ? `$${item.parts_total.toFixed(2)}` : '—'}
                </td>
                <td className="number">
                  <strong>${item.line_total.toFixed(2)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ fontSize: '12px', color: '#999', marginBottom: '20px' }}>No line items</p>
      )}

      {/* Totals section */}
      <div className="totals">
        <div className="total-row">
          <span>Labor Total:</span>
          <strong>${subtotalLabor.toFixed(2)}</strong>
        </div>
        <div className="total-row">
          <span>Parts Total:</span>
          <strong>${subtotalParts.toFixed(2)}</strong>
        </div>
        {subtotalOther > 0 && (
          <div className="total-row">
            <span>Other:</span>
            <strong>${subtotalOther.toFixed(2)}</strong>
          </div>
        )}
        <div className="total-row">
          <span>Subtotal:</span>
          <strong>${subtotal.toFixed(2)}</strong>
        </div>

        {/* Tax (on parts only) */}
        {taxRate && taxRate > 0 && (
          <div className="total-row">
            <span>Tax on parts ({(taxRate * 100).toFixed(2)}%):</span>
            <strong>${taxAmount.toFixed(2)}</strong>
          </div>
        )}

        {/* Grand total */}
        <div className="total-row final">
          <span>Total Due:</span>
          <strong>${total.toFixed(2)}</strong>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div style={{ marginTop: 24, fontSize: '12px', borderTop: '1px solid #ccc', paddingTop: 12 }}>
          <strong>Notes:</strong>
          <p style={{ marginTop: 6, whiteSpace: 'pre-wrap', color: '#333' }}>
            {invoice.notes}
          </p>
        </div>
      )}

      {/* Legal / Compliance */}
      {(profile?.bar_license || profile?.seller_permit) && (
        <div style={{ marginTop: 20, fontSize: '10px', color: '#888', borderTop: '1px solid #ddd', paddingTop: 10 }}>
          {profile?.bar_license && <p>BAR License: {profile.bar_license}</p>}
          {profile?.seller_permit && <p>Seller&apos;s Permit: {profile.seller_permit}</p>}
        </div>
      )}

      {/* Warranty */}
      {profile?.warranty_text && (
        <div style={{ marginTop: 16, fontSize: '11px', color: '#555' }}>
          <strong>Warranty:</strong>
          <p style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>
            {profile.warranty_text}
          </p>
        </div>
      )}

      {/* Invoice Terms */}
      {profile?.invoice_terms && (
        <div style={{ marginTop: 12, fontSize: '11px', color: '#555' }}>
          <strong>Terms:</strong>
          <p style={{ marginTop: 4 }}>{profile.invoice_terms}</p>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 40, paddingTop: 12, borderTop: '1px solid #ccc', fontSize: '11px', color: '#666' }}>
        <p>{profile?.invoice_footer ?? 'Thank you for your business!'}</p>
      </div>
    </div>
  )
}
