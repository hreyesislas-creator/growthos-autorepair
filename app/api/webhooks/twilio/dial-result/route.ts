/**
 * Twilio Dial Action Callback
 * Receives the result of the <Dial> attempt to the shop's number.
 * This is the source of truth for missed-call classification.
 *
 * DialCallStatus determines if call was:
 * - answered (completed, in-progress)
 * - no-answer (caller dialed but shop didn't answer)
 * - busy (shop line was busy)
 * - failed (dial failed for technical reason)
 *
 * Phase 1: Single-tenant, no signature validation
 */

import { createAdminClient } from '@/lib/supabase/server'
import { sendMissedCallSMS } from '@/lib/twilio'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Parse form data from Twilio dial action callback
    const body = await request.formData()
    const callSid = body.get('CallSid') as string | null
    const dialCallStatus = body.get('DialCallStatus') as string | null
    const dialCallSid = body.get('DialCallSid') as string | null
    const dialCallDuration = body.get('DialCallDuration') as string | null

    // Log webhook for debugging (Phase 1)
    console.log('[Twilio Dial Result] Action callback received', {
      callSid,
      dialCallStatus,
      dialCallSid,
      dialCallDuration,
      headers: {
        'x-twilio-signature': request.headers.get('x-twilio-signature'),
      },
    })

    // Phase 2: TODO - Implement proper Twilio signature validation
    // For Phase 1: Skip validation to avoid raw body handling complexity

    // Validate required fields
    if (!callSid || !dialCallStatus) {
      console.error('[Twilio Dial Result] Missing required fields', {
        callSid,
        dialCallStatus,
      })
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const supabase = await createAdminClient()

    // Find the call log by CallSid (original inbound call)
    const { data: callLog, error: fetchError } = await supabase
      .from('call_logs')
      .select('*')
      .eq('twilio_call_sid', callSid)
      .single()

    if (fetchError || !callLog) {
      console.warn('[Twilio Dial Result] Call log not found', { callSid })
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    // Determine if call was answered based on DialCallStatus
    const dialDurationSeconds = dialCallDuration ? parseInt(dialCallDuration, 10) : 0
    const answered = dialCallStatus === 'completed' || dialCallStatus === 'in-progress'
    const disposition = answered ? 'answered' : dialCallStatus // no-answer, busy, failed, etc.

    // Update call log with dial result
    const { error: updateError } = await supabase
      .from('call_logs')
      .update({
        call_status: 'completed',
        disposition,
        connected_at: answered ? new Date().toISOString() : null,
        ended_at: new Date().toISOString(),
        call_duration_seconds: dialDurationSeconds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', callLog.id)

    if (updateError) {
      console.error('[Twilio Dial Result] Failed to update call log', {
        callSid,
        error: updateError,
      })
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    console.log('[Twilio Dial Result] Call log updated', {
      callSid,
      dialCallStatus,
      disposition,
    })

    // Send missed-call SMS if conditions are met
    // SOURCE OF TRUTH: DialCallStatus must be one of: no-answer, busy, failed
    if (
      ['no-answer', 'busy', 'failed'].includes(dialCallStatus) &&
      !callLog.missed_call_sms_sent &&
      callLog.from_number &&
      process.env.TWILIO_SMS_ENABLED === 'true'
    ) {
      // Phase 1: Atomic claim-first approach for duplicate prevention
      // TODO (Phase 2): Separate "claimed" vs "sent" state to allow retries on SMS provider failures
      // Current approach: claim first to prevent duplicate SMS on concurrent callbacks.
      // Trade-off: SMS provider failure after claim will not auto-retry in Phase 1.
      // This is acceptable for Phase 1 - preventing duplicates is higher priority than retry logic.

      const { data: claimedLogs, error: claimError } = await supabase
        .from('call_logs')
        .update({
          missed_call_sms_sent: true,
          missed_call_sms_sent_at: new Date().toISOString(),
        })
        .eq('id', callLog.id)
        .eq('missed_call_sms_sent', false)
        .select()
        .single()

      if (claimError || !claimedLogs) {
        // Another callback already claimed this SMS
        console.log('[Twilio Dial Result] SMS already claimed by another callback', { callSid })
        return NextResponse.json({ ok: true }, { status: 200 })
      }

      // We successfully claimed the SMS send
      console.log('[Twilio Dial Result] Claimed SMS, sending to caller', {
        callSid,
        dialCallStatus,
        toNumber: callLog.from_number,
      })

      const smsSid = await sendMissedCallSMS(callLog.from_number)

      if (smsSid) {
        console.log('[Twilio Dial Result] SMS sent successfully', {
          callSid,
          smsSid,
        })
      } else {
        console.warn('[Twilio Dial Result] SMS send failed after claiming', {
          callSid,
          dialCallStatus,
          toNumber: callLog.from_number,
        })
      }
    } else if (!['no-answer', 'busy', 'failed'].includes(dialCallStatus)) {
      console.log('[Twilio Dial Result] SMS not sent - call was answered', {
        callSid,
        dialCallStatus,
      })
    } else if (process.env.TWILIO_SMS_ENABLED !== 'true') {
      console.log('[Twilio Dial Result] SMS not sent - SMS disabled via env', { callSid })
    } else {
      console.log('[Twilio Dial Result] SMS not sent - already sent or missing from_number', {
        callSid,
        missed_call_sms_sent: callLog.missed_call_sms_sent,
        has_from_number: !!callLog.from_number,
      })
    }

    // Return 200 to acknowledge (empty response is OK for action callback)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('[Twilio Dial Result] Unexpected error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ ok: true }, { status: 200 })
  }
}
