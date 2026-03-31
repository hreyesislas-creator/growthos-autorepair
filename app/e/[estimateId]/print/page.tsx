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

  const estimate = estimateRes.data
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

      // Business profile - FILTER by estimate's tenant_id
      supabase
        .from('business_profiles')
        .select('phone, logo_url')
        .eq('tenant_id', estimate.tenant_id)
        .maybeSingle(),
    ])

  // ── Shape data
  const shopName = tenantRes.data?.name ?? 'Auto Repair Shop'
  const shopPhone = profileRes.data?.phone ?? null
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
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.5;
          color: #000;
          background: #fff;
        }

        .page {
          max-width: 8.5in;
          margin: 0 auto;
          padding: 0.5in;
          background: #fff;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #000;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }

        .shop-info h1 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .shop-info p {
          font-size: 12px;
          color: #555;
          margin: 2px 0;
        }

        .estimate-meta {
          text-align: right;
          font-size: 12px;
        }

        .estimate-meta h2 {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .estimate-meta p {
          margin: 2px 0;
        }

        .customer-vehicle {
          display: flex;
          gap: 40px;
          margin-bottom: 20px;
          font-size: 12px;
        }

        .customer-vehicle div {
          flex: 1;
        }

        .customer-vehicle strong {
          display: block;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 12px;
        }

        .items-table th {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          padding: 8px;
          text-align: left;
          font-weight: 600;
        }

        .items-table td {
          border: 1px solid #d1d5db;
          padding: 8px;
        }

        .items-table tr:nth-child(even) {
          background: #fafafa;
        }

        .items-table .number {
          text-align: right;
        }

        .totals {
          margin: 20px 0;
          border-top: 2px solid #000;
          padding-top: 12px;
          font-size: 13px;
        }

        .total-row {
          display: flex;
          justify-content: flex-end;
          gap: 60px;
          margin-bottom: 6px;
        }

        .total-row strong {
          width: 100px;
          text-align: right;
        }

        .total-row.final {
          font-size: 16px;
          font-weight: 700;
          border-top: 1px solid #000;
          padding-top: 8px;
          margin-top: 12px;
        }

        .signature-area {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ccc;
          font-size: 12px;
        }

        .signature-block {
          margin-bottom: 20px;
        }

        .signature-line {
          border-bottom: 1px solid #000;
          height: 50px;
          margin-bottom: 4px;
        }

        .signature-label {
          font-size: 11px;
          color: #555;
        }

        .authorization-text {
          font-size: 11px;
          line-height: 1.6;
          margin-top: 20px;
          padding: 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
        }

        @media print {
          body {
            margin: 0;
            padding: 0;
            background: #fff;
          }
          .page {
            max-width: 100%;
            margin: 0;
            padding: 0.5in;
            box-shadow: none;
            page-break-after: always;
          }
        }
      `}</style>
      <div className="page">
          {/* Header */}
          <div className="header">
            <div className="shop-info">
              <h1>{shopName}</h1>
              {shopPhone && <p>📞 {shopPhone}</p>}
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
      </div>
    </>
  )
}
