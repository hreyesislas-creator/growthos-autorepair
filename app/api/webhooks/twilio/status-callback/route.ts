/**
 * Twilio Status Callback Webhook
 * Receives call state updates and triggers missed-call SMS if needed.
 *
 * Flow:
 * 1. Twilio calls this endpoint as call progresses (ringing → in-progress → completed)
 * 2. We update CallLog with new status
 * 3. Determine if call was answered (connected_at set) or missed (never answered)
 * 4. If missed AND not already sent, send SMS
 * 5. Mark SMS as sent to prevent duplicates
 *
 * Phase 1: Single-tenant, no signature validation
 * Phase 2: TODO - Implement proper Twilio signature validation
 */

import { createAdminClient } from '@/lib/supabase/server'
import { sendMissedCallSMS } from '@/lib/twilio'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Parse form data from Twilio webhook
    const body = await request.formData()
    const callSid = body.get('CallSid') as string | null
    const callStatus = body.get('CallStatus') as string | null
    const duration = body.get('CallDuration') as string | null

    // Log webhook for debugging (Phase 1)
    console.log('[Twilio Status Callback] Webhook received', {
      callSid,
      callStatus,
      duration,
      headers: {
        'x-twilio-signature': request.headers.get('x-twilio-signature'),
      },
    })

    // Phase 2: TODO - Implement proper Twilio signature validation
    // For Phase 1: Skip validation to avoid raw body handling complexity in Next.js App Router

    // Validate required fields
    if (!callSid || !callStatus) {
      console.error('[Twilio Status Callback] Missing required fields', {
        callSid,
        callStatus,
      })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // Find the call log by CallSid
    const { data: callLog, error: fetchError } = await supabase
      .from('call_logs')
      .select('*')
      .eq('twilio_call_sid', callSid)
      .single()

    if (fetchError || !callLog) {
      console.warn('[Twilio Status Callback] Call log not found', { callSid })
      // Still return 200 to acknowledge receipt
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    // Determine disposition and update timestamps based on status
    let connected_at = callLog.connected_at
    let ended_at = callLog.ended_at
    let disposition = callLog.disposition
    let callDurationSeconds = duration ? parseInt(duration, 10) : null

    // When call transitions to in-progress (answered), set connected_at
    if (callStatus === 'in-progress' && !connected_at) {
      connected_at = new Date().toISOString()
    }

    // When call is completed, set ended_at and determine disposition
    if (callStatus === 'completed') {
      ended_at = new Date().toISOString()
      // Disposition is determined by whether call was connected
      disposition = connected_at ? 'answered' : 'missed'
    }

    // Update the call log
    const { error: updateError } = await supabase
      .from('call_logs')
      .update({
        call_status: callStatus,
        connected_at,
        ended_at,
        disposition,
        call_duration_seconds: callDurationSeconds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', callLog.id)

    if (updateError) {
      console.error('[Twilio Status Callback] Failed to update call log', {
        callSid,
        error: updateError,
      })
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    console.log('[Twilio Status Callback] Call log updated', {
      callSid,
      status: callStatus,
      disposition,
    })

    // Send missed-call SMS if conditions are met
    if (
      callStatus === 'completed' &&
      disposition === 'missed' &&
      !callLog.missed_call_sms_sent &&
      callLog.from_number
    ) {
      console.log('[Twilio Status Callback] Sending missed-call SMS', {
        callSid,
        toNumber: callLog.from_number,
      })

      const smsSid = await sendMissedCallSMS(callLog.from_number)

      if (smsSid) {
        // Mark SMS as sent
        const { error: smsError } = await supabase
          .from('call_logs')
          .update({
            missed_call_sms_sent: true,
            missed_call_sms_sent_at: new Date().toISOString(),
          })
          .eq('id', callLog.id)

        if (smsError) {
          console.error('[Twilio Status Callback] Failed to mark SMS as sent', {
            callSid,
            error: smsError,
          })
        }
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('[Twilio Status Callback] Unexpected error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ ok: true }, { status: 200 })
  }
}
