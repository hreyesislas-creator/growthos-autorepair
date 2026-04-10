/**
 * Twilio Inbound Voice Webhook
 * Receives incoming call notifications and creates call log records.
 *
 * Flow:
 * 1. Twilio sends POST to this endpoint when call arrives
 * 2. We create CallLog record with initial state
 * 3. Return TwiML response to queue/route the call
 * 4. Set StatusCallback for future state updates
 *
 * Phase 1: Single-tenant using TENANT_ID env var
 * Phase 2: TODO - Replace with phone-number-based tenant resolution
 */

import { createAdminClient } from '@/lib/supabase/server'
import { normalizePhoneNumber } from '@/lib/twilio'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Parse form data from Twilio webhook
    const body = await request.formData()
    const fromNumber = body.get('From') as string | null
    const toNumber = body.get('To') as string | null
    const callSid = body.get('CallSid') as string | null
    const accountSid = body.get('AccountSid') as string | null

    // Log webhook for debugging (Phase 1)
    console.log('[Twilio Inbound] Webhook received', {
      fromNumber,
      toNumber,
      callSid,
      headers: {
        'x-twilio-signature': request.headers.get('x-twilio-signature'),
      },
    })

    // Phase 2: TODO - Implement proper Twilio signature validation
    // For Phase 1: Skip validation to avoid raw body handling complexity in Next.js App Router
    // Validate required fields are present
    if (!fromNumber || !toNumber || !callSid) {
      console.error('[Twilio Inbound] Missing required Twilio fields', {
        fromNumber,
        toNumber,
        callSid,
      })
      return NextResponse.json(
        { error: 'Missing required Twilio webhook fields' },
        { status: 400 }
      )
    }

    // Phase 1: Use TENANT_ID from env (single-tenant)
    // TODO: Replace with phone-number-based tenant resolution in multi-tenant phase
    const tenantId = process.env.TENANT_ID
    if (!tenantId) {
      console.error('[Twilio Inbound] TENANT_ID not configured')
      return NextResponse.json(
        { error: 'System not configured for calls' },
        { status: 500 }
      )
    }

    // Normalize phone numbers
    const normalizedFromNumber = normalizePhoneNumber(fromNumber)
    const normalizedToNumber = normalizePhoneNumber(toNumber)

    if (!normalizedFromNumber) {
      console.warn('[Twilio Inbound] Could not normalize from_number', { fromNumber })
    }

    // Create call log record
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('call_logs')
      .insert({
        tenant_id: tenantId,
        twilio_call_sid: callSid,
        twilio_account_sid: accountSid,
        from_number: normalizedFromNumber || fromNumber,
        to_number: normalizedToNumber || toNumber,
        call_status: 'ringing',
        disposition: null,
        initiated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[Twilio Inbound] Failed to create call log', { error })
      return NextResponse.json(
        { error: 'Failed to log call' },
        { status: 500 }
      )
    }

    console.log('[Twilio Inbound] Call log created', { callSid, id: data?.id })

    // Return TwiML to dial the shop's number
    // Use action callback to capture dial result (DialCallStatus)
    const webhookUrl = process.env.TWILIO_WEBHOOK_URL || 'https://localhost:3000'
    const dialActionUrl = `${webhookUrl}/api/webhooks/twilio/dial-result`
    const shopNumber = process.env.TWILIO_SHOP_NUMBER
    const dialTimeout = process.env.TWILIO_DIAL_TIMEOUT || '5'

    if (!shopNumber) {
      console.error('[Twilio Inbound] TWILIO_SHOP_NUMBER not configured')
      return NextResponse.json(
        { error: 'System not configured for calls' },
        { status: 500 }
      )
    }

    // TwiML: Direct dial to shop's number, send result to action callback
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="${dialTimeout}" action="${dialActionUrl}">
    ${shopNumber}
  </Dial>
</Response>`

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
      },
    })
  } catch (error) {
    console.error('[Twilio Inbound] Unexpected error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
