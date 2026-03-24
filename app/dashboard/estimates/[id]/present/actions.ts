'use server'

/**
 * Server actions for the advisor-facing Customer Presentation screen.
 *
 * sendEstimateByText — sends the public estimate link to the customer's phone.
 *
 * Architecture notes:
 *   • Uses the Twilio Messaging REST API directly (no SDK needed).
 *   • Reads TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER from env.
 *   • If those vars are absent (dev / staging), logs a warning and returns success
 *     so the UI flow can be tested without a live Twilio account.
 *   • On success, inserts a row in message_logs for delivery tracking and
 *     future resend / follow-up automation.
 *   • The public estimate URL is built from NEXT_PUBLIC_BASE_URL → VERCEL_URL → fallback,
 *     so it is NEVER derived from window.location (server-side safe).
 */

import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardTenant }  from '@/lib/tenant'

// ── Result type ───────────────────────────────────────────────────────────────

export interface SendTextResult {
  success?:  true
  noPhone?:  true          // customer has no phone on file
  notWired?: true          // Twilio env vars not set — dev mode
  error?:    string
}

// ── Action ────────────────────────────────────────────────────────────────────

export async function sendEstimateByText(
  estimateId: string,
): Promise<SendTextResult> {
  // Must be called from an authenticated dashboard session
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authenticated.' }

  const supabase = createAdminClient()

  // ── 1. Load estimate header ─────────────────────────────────────────────────
  const { data: estimate, error: estErr } = await supabase
    .from('estimates')
    .select('id, customer_id, estimate_number, tenant_id')
    .eq('id', estimateId)
    .maybeSingle()

  if (estErr || !estimate) return { error: 'Estimate not found.' }

  // ── 2. Load customer phone + first name ─────────────────────────────────────
  const { data: customer } = estimate.customer_id
    ? await supabase
        .from('customers')
        .select('first_name, phone')
        .eq('id', estimate.customer_id)
        .single()
    : { data: null }

  if (!customer?.phone?.trim()) return { noPhone: true }

  // ── 3. Load shop name ───────────────────────────────────────────────────────
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', estimate.tenant_id)
    .single()

  const shopName  = tenant?.name   ?? 'Your Auto Shop'
  const firstName = customer.first_name?.trim() || 'there'

  // ── 4. Build the public estimate URL ────────────────────────────────────────
  // Priority: NEXT_PUBLIC_BASE_URL → VERCEL_URL (added by Vercel automatically) → placeholder.
  // This is NEVER window.location — safe to run on the server.
  const rawBase = process.env.NEXT_PUBLIC_BASE_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    ?? 'https://your-shop.app'

  const baseUrl   = rawBase.replace(/\/$/, '')
  const publicUrl = `${baseUrl}/e/${estimateId}`

  // ── 5. Compose SMS message ───────────────────────────────────────────────────
  const message =
    `Hi ${firstName}, here is your repair estimate from ${shopName}: ` +
    `${publicUrl}. You can review and approve your recommended work here.`

  // ── 6. Twilio — fire if configured, warn + skip if not ──────────────────────
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_FROM_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    // Dev / staging: Twilio not wired yet — log the payload and return a special
    // "not wired" flag so the UI can show a yellow informational toast instead
    // of a hard error.
    console.warn(
      '[sendEstimateByText] Twilio env vars not set. ' +
      'Would have sent SMS to',
      customer.phone,
      '→',
      message,
    )
    return { success: true, notWired: true }
  }

  // Normalize phone number — keep leading + and digits only
  const toNumber = customer.phone.replace(/[^\d+]/g, '')
  const formBody = new URLSearchParams({
    To:   toNumber,
    From: fromNumber,
    Body: message,
  })

  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method:  'POST',
      headers: {
        Authorization:  'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    },
  )

  if (!twilioRes.ok) {
    const json = await twilioRes.json().catch(() => ({})) as { message?: string }
    console.error('[sendEstimateByText] Twilio error:', json)
    return { error: json.message ?? 'SMS delivery failed. Please try again.' }
  }

  // ── 7. Log to message_logs for delivery history + future resend ─────────────
  await supabase.from('message_logs').insert({
    tenant_id:   estimate.tenant_id,
    customer_id: estimate.customer_id ?? null,
    channel:     'sms',
    to_address:  toNumber,
    subject:     null,
    body:        message,
    status:      'sent',
    sent_at:     new Date().toISOString(),
  })

  return { success: true }
}
