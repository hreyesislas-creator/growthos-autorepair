'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardTenant } from '@/lib/tenant'
import type { PaymentMethod, CardType } from '@/lib/types'

export type { PaymentMethod, CardType }

export interface RecordPaymentInput {
  amount:               number
  payment_method:       PaymentMethod
  paid_at:              string        // ISO datetime string
  note?:                string | null
  // Card-specific (required when payment_method = 'card')
  card_type?:           CardType | null
  last4_digits?:        string | null
  authorization_number?: string | null
  // Reference-based (required for zelle | check | financing | other)
  reference_number?:    string | null
}

/**
 * Records a payment against an invoice.
 *
 * Inserts a row into invoice_payments, then updates the invoice's
 * denormalized payment_status, amount_paid, and balance_due fields.
 * When fully paid, also syncs the legacy invoices.status → 'paid'.
 */
export async function recordInvoicePayment(
  invoiceId: string,
  input: RecordPaymentInput,
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const supabase = createAdminClient()
  const tenantId = ctx.tenant.id

  // ── 1. Load current invoice ────────────────────────────────────────────────
  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .select('id, tenant_id, customer_id, total, amount_paid, balance_due, payment_status, status')
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (invErr || !invoice) return { error: 'Invoice not found.' }
  if (invoice.payment_status === 'paid') return { error: 'Invoice is already fully paid.' }

  const total       = Number(invoice.total)
  const currentPaid = Number(invoice.amount_paid ?? 0)

  if (input.amount <= 0) return { error: 'Payment amount must be greater than zero.' }
  if (input.amount > Number(invoice.balance_due ?? total) + 0.01) {
    return { error: 'Payment amount exceeds the outstanding balance.' }
  }

  // ── 2. Insert payment record ───────────────────────────────────────────────
  const { error: insertErr } = await supabase
    .from('invoice_payments')
    .insert({
      tenant_id:            tenantId,
      invoice_id:           invoiceId,
      customer_id:          invoice.customer_id ?? null,
      amount:               input.amount,
      payment_method:       input.payment_method,
      paid_at:              input.paid_at,
      note:                 input.note?.trim() || null,
      // Card metadata
      card_type:            input.card_type ?? null,
      last4_digits:         input.last4_digits?.trim() || null,
      authorization_number: input.authorization_number?.trim() || null,
      // Reference for non-cash methods
      reference_number:     input.reference_number?.trim() || null,
    })

  if (insertErr) {
    console.error('[recordInvoicePayment] insert:', insertErr.message)
    return { error: insertErr.message }
  }

  // ── 3. Recalculate invoice payment summary ─────────────────────────────────
  const newAmountPaid  = Math.round((currentPaid + input.amount) * 100) / 100
  const newBalanceDue  = Math.max(0, Math.round((total - newAmountPaid) * 100) / 100)
  const newPaymentStatus =
    newBalanceDue <= 0  ? 'paid'
    : newAmountPaid > 0 ? 'partially_paid'
    : 'unpaid'

  // ── 4. Update invoice ──────────────────────────────────────────────────────
  const { error: updateErr } = await supabase
    .from('invoices')
    .update({
      amount_paid:    newAmountPaid,
      balance_due:    newBalanceDue,
      payment_status: newPaymentStatus,
      ...(newPaymentStatus === 'paid' ? { status: 'paid' } : {}),
      updated_at:     new Date().toISOString(),
    })
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)

  if (updateErr) {
    console.error('[recordInvoicePayment] update invoice:', updateErr.message)
    return { error: updateErr.message }
  }

  return null
}
