/**
 * Printable estimate page
 * Route: /e/[estimateId]/print
 *
 * Renders a clean, printer-friendly version of the estimate
 * suitable for physical signing and archival.
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import './styles.css'

// Local type for estimate row (matches selected fields in this page)
interface EstimateData {
  id: string
  tenant_id: string
  customer_id: string | null
  vehicle_id: string | null
  estimate_number: string
  status: string
  subtotal: number | string
  tax_rate: number | string | null
  tax_amount: number | string
  total: number | string
  created_at: string
  notes: string | null
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
  invoice_footer: string | null
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: { estimateId: string }
}): Promise<Metadata> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('estimates')
    .select('estimate_number, tenant_id')
    .eq('id', params.estimateId)
    .maybeSingle()

  if (!data) return { title: 'Estimate' }

  return {
    title: `Print Estimate ${data.estimate_number}`,
    robots: { index: false, follow: false },
  }
}

export default async function EstimatePrintPage({
  params,
}: {
  params: { estimateId: string }
}) {
  const supabase = createAdminClient()

  // ── 1. Fetch estimate first (needed for FK relationships)
  const estimateRes = await supabase
    .from('estimates')
    .select(
      'id, tenant_id, customer_id, vehicle_id, estimate_number, status, ' +
      'subtotal, tax_rate, tax_amount, total, created_at, notes',
    )
    .eq('id', params.estimateId)
    .maybeSingle()

  const estimate = estimateRes.data as EstimateData | null
  if (!estimate) return notFound()

  // ── 2. Fetch related data using estimate's FKs
  const [itemsRes, customerRes, vehicleRes, tenantRes, profileRes] =
    await Promise.all([
      supabase
        .from('estimate_items')
        .select(
          'id, title, description, labor_hours, labor_rate, labor_total, parts_total, line_total, display_order',
        )
        .eq('estimate_id', params.estimateId)
        .order('display_order'),

      // Customer - FILTER by estimate's customer_id
      estimate.customer_id
        ? supabase
            .from('customers')
            .select('first_name, last_name, phone, email')
            .eq('id', estimate.customer_id)
            .single()
        : Promise.resolve({ data: null }),

      // Vehicle - FILTER by estimate's vehicle_id
      estimate.vehicle_id
        ? supabase
            .from('vehicles')
            .select('year, make, model, license_plate')
            .eq('id', estimate.vehicle_id)
            .single()
        : Promise.resolve({ data: null }),

      // Tenant - FILTER by estimate's tenant_id
      supabase
        .from('tenants')
        .select('name')
        .eq('id', estimate.tenant_id)
        .single(),

      // Business profile - FILTER by estimate's tenant_id (tenant-scoped)
      supabase
        .from('business_profiles')
        .select(
          'business_name, address_line_1, address_line_2, city, state, zip_code, ' +
          'phone, email, website, logo_url, bar_license, seller_permit, ' +
          'warranty_text, invoice_footer',
        )
        .eq('tenant_id', estimate.tenant_id)
        .maybeSingle(),
    ])

  // ── Shape data
  const tenant = tenantRes.data
  const profile = profileRes.data as BusinessProfileData | null
  const shopName = profile?.business_name ?? tenant?.name ?? 'Auto Repair Shop'
  const customer = customerRes.data
  const vehicle = vehicleRes.data
  const items = itemsRes.data ?? []

  const customerName = customer
    ? `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim()
    : null

  const vehicleLabel = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')
    : null

  const estimateDate = new Date(estimate.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  // ── Compute totals
  const subtotal = Number(estimate.subtotal) || 0
  const taxRate = Number(estimate.tax_rate) || 0
  const taxAmount = Number(estimate.tax_amount) || 0
  const total = Number(estimate.total) || 0

  return (
    <div className="page">
          {/* Header */}
          <div className="header">
            <div className="shop-info">
              <h1>{shopName}</h1>
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
            <div className="estimate-meta">
              <h2>Service Estimate</h2>
              <p>
                <strong>Est. #</strong> {estimate.estimate_number}
              </p>
              <p>
                <strong>Date:</strong> {estimateDate}
              </p>
            </div>
          </div>

          {/* Customer & Vehicle */}
          <div className="customer-vehicle">
            <div>
              <strong>Customer:</strong>
              <p>{customerName || '___________________'}</p>
              {customer?.phone && <p>📞 {customer.phone}</p>}
            </div>
            <div>
              <strong>Vehicle:</strong>
              <p>{vehicleLabel || '___________________'}</p>
              {vehicle?.license_plate && <p>Plate: {vehicle.license_plate}</p>}
            </div>
          </div>

          {/* Items Table */}
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Service Description</th>
                <th style={{ width: '15%' }} className="number">
                  Labor
                </th>
                <th style={{ width: '15%' }} className="number">
                  Parts
                </th>
                <th style={{ width: '15%' }} className="number">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    {item.description && (
                      <div style={{ color: '#666', fontSize: '11px', marginTop: 2 }}>
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td className="number">${Number(item.labor_total || 0).toFixed(2)}</td>
                  <td className="number">${Number(item.parts_total || 0).toFixed(2)}</td>
                  <td className="number">
                    <strong>${Number(item.line_total || 0).toFixed(2)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="totals">
            <div className="total-row">
              <span>Subtotal:</span>
              <strong>${subtotal.toFixed(2)}</strong>
            </div>
            {taxRate > 0 && (
              <div className="total-row">
                <span>Tax ({(taxRate * 100).toFixed(1)}%):</span>
                <strong>${taxAmount.toFixed(2)}</strong>
              </div>
            )}
            <div className="total-row final">
              <span>TOTAL:</span>
              <strong>${total.toFixed(2)}</strong>
            </div>
          </div>

          {/* Signature Area */}
          <div className="signature-area">
            <div style={{ display: 'flex', gap: 60 }}>
              <div className="signature-block" style={{ flex: 1 }}>
                <div className="signature-line"></div>
                <div className="signature-label">Customer Signature</div>
              </div>
              <div className="signature-block" style={{ flex: 1 }}>
                <div className="signature-line"></div>
                <div className="signature-label">Date</div>
              </div>
            </div>

            {/* Authorization Text */}
            <div className="authorization-text">
              <strong>Authorization:</strong>
              <p style={{ marginTop: 6 }}>
                I have reviewed and understand the above repair estimate. I authorize
                the shop to proceed with the listed services upon my approval. I
                understand that additional repairs not listed here may be discovered
                during service and will be communicated to me for approval.
              </p>
            </div>
          </div>

          {/* Notes (if any) */}
          {estimate.notes && (
            <div style={{ marginTop: 20, fontSize: '11px', color: '#666' }}>
              <strong>Notes:</strong>
              <p style={{ marginTop: 4 }}>{estimate.notes}</p>
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

          {/* Footer */}
          {profile?.invoice_footer && (
            <div style={{ marginTop: 20, fontSize: '11px', color: '#666', borderTop: '1px solid #ccc', paddingTop: 12 }}>
              <p>{profile.invoice_footer}</p>
            </div>
          )}
      </div>
    )
}
