/**
 * Telnyx inbound SMS webhook.
 * Acknowledges with 200; persists events (deduped by event_id); no auto-reply.
 */

import {
  emptyExtractedTelnyxInboundMessage,
  extractTelnyxInboundMessage,
} from '@/lib/telnyx/extractInboundMessage'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const PG_UNIQUE_VIOLATION = '23505'

export async function POST(request: NextRequest) {
  const signaturePresent = Boolean(request.headers.get('telnyx-signature-ed25519'))
  const timestampHeader = request.headers.get('telnyx-timestamp')

  let rawBody = ''
  try {
    rawBody = await request.text()
  } catch (err) {
    console.error('[Telnyx SMS Inbound] Failed to read request body', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  let payload: unknown = null
  let parseError: string | null = null

  const trimmed = rawBody.trim()
  if (trimmed.length === 0) {
    console.warn('[Telnyx SMS Inbound] Empty body', {
      signaturePresent,
      telnyxTimestamp: timestampHeader,
    })
  } else {
    try {
      payload = JSON.parse(trimmed) as unknown
    } catch (err) {
      parseError = err instanceof Error ? err.message : 'invalid_json'
      console.warn('[Telnyx SMS Inbound] Invalid JSON', {
        parseError,
        signaturePresent,
        telnyxTimestamp: timestampHeader,
        bodyPreview: trimmed.slice(0, 500),
      })
    }
  }

  if (!parseError) {
    try {
      console.log('[TELNYX FULL PAYLOAD]', JSON.stringify(payload, null, 2))
    } catch (stringifyErr) {
      console.warn('[Telnyx SMS Inbound] Full payload JSON.stringify failed', {
        error: stringifyErr instanceof Error ? stringifyErr.message : String(stringifyErr),
      })
    }
  }

  console.log('[TELNYX HEADERS]', {
    signature: request.headers.get('telnyx-signature-ed25519'),
    timestamp: request.headers.get('telnyx-timestamp'),
  })

  const extracted =
    !parseError && payload !== null && typeof payload === 'object'
      ? extractTelnyxInboundMessage(payload)
      : emptyExtractedTelnyxInboundMessage()

  console.log('[Telnyx SMS Inbound] Webhook received', {
    eventType: extracted.eventType,
    eventId: extracted.eventId,
    messageId: extracted.messageId,
    fromPhone: extracted.fromPhone,
    toPhone: extracted.toPhone,
    text: extracted.text,
    direction: extracted.direction,
    receivedAt: extracted.receivedAt,
    occurredAt: extracted.occurredAt,
    messagingProfileId: extracted.messagingProfileId,
    signaturePresent,
    telnyxTimestamp: timestampHeader,
  })

  if (!parseError && payload !== null && typeof payload === 'object' && extracted.eventId) {
    try {
      const supabase = createAdminClient()

      let tenantId: string | null = null
      if (extracted.toPhone) {
        const { data: phoneRow, error: phoneError } = await supabase
          .from('tenant_phone_numbers')
          .select('tenant_id')
          .eq('phone_number', extracted.toPhone)
          .eq('is_active', true)
          .eq('provider', 'telnyx')
          .maybeSingle()

        if (phoneError) {
          console.error('[Telnyx SMS Inbound] tenant_phone_numbers lookup failed', {
            error: phoneError.message,
            code: phoneError.code,
            toPhone: extracted.toPhone,
          })
        } else if (phoneRow?.tenant_id) {
          tenantId = phoneRow.tenant_id as string
        } else {
          console.warn('[Telnyx SMS Inbound] No tenant match for inbound number', {
            toPhone: extracted.toPhone,
          })
        }
      } else {
        console.warn('[Telnyx SMS Inbound] No to_phone in payload; tenant_id will be null')
      }

      const processedAt = new Date().toISOString()

      console.log('[TELNYX PERSISTENCE BLOCK ENTERED]', {
        eventId: extracted.eventId,
        eventType: extracted.eventType,
        fromPhone: extracted.fromPhone,
        toPhone: extracted.toPhone,
        hasPayloadObject: payload !== null && typeof payload === 'object',
        parseError,
      })

      const insertRow = {
        tenant_id: tenantId,
        provider: 'telnyx',
        event_id: extracted.eventId,
        message_id: extracted.messageId,
        event_type: extracted.eventType,
        from_phone: extracted.fromPhone,
        to_phone: extracted.toPhone,
        message_text: extracted.text,
        raw_payload: payload as Record<string, unknown>,
        occurred_at: extracted.occurredAt,
        received_at: extracted.receivedAt,
        processed_at: processedAt,
      }

      console.log('[TELNYX ABOUT TO INSERT EVENT]')
      const { error: insertError } = await supabase.from('telnyx_inbound_events').insert(insertRow)

      if (insertError) {
        console.log('[TELNYX INSERT ERROR]', insertError)
        if (insertError.code === PG_UNIQUE_VIOLATION) {
          console.log('[Telnyx SMS Inbound] Duplicate event_id (already stored)', {
            eventId: extracted.eventId,
          })
        } else {
          console.error('[Telnyx SMS Inbound] Failed to insert telnyx_inbound_events', {
            error: insertError.message,
            code: insertError.code,
            eventId: extracted.eventId,
          })
        }
      } else {
        console.log('[TELNYX INSERT SUCCEEDED]')
      }

      const smokeEventId = `${extracted.eventId}__smoke_${Date.now()}`
      const smokeProcessedAt = new Date().toISOString()
      console.log('[TELNYX ABOUT TO INSERT EVENT]')
      const { error: smokeInsertError } = await supabase.from('telnyx_inbound_events').insert({
        ...insertRow,
        event_id: smokeEventId,
        processed_at: smokeProcessedAt,
      })

      if (smokeInsertError) {
        console.log('[TELNYX INSERT ERROR]', smokeInsertError)
        if (smokeInsertError.code === PG_UNIQUE_VIOLATION) {
          console.log('[Telnyx SMS Inbound] Duplicate event_id (already stored)', {
            eventId: smokeEventId,
          })
        } else {
          console.error('[Telnyx SMS Inbound] Failed to insert telnyx_inbound_events', {
            error: smokeInsertError.message,
            code: smokeInsertError.code,
            eventId: smokeEventId,
          })
        }
      } else {
        console.log('[TELNYX INSERT SUCCEEDED]')
      }
    } catch (persistErr) {
      console.error('[TELNYX PERSISTENCE BLOCK FAILED]', {
        error: persistErr instanceof Error ? persistErr.message : String(persistErr),
        stack: persistErr instanceof Error ? persistErr.stack : undefined,
        eventId: extracted.eventId,
      })
    }
  } else if (!parseError && payload !== null && typeof payload === 'object' && !extracted.eventId) {
    console.warn('[Telnyx SMS Inbound] Skipping persistence: missing event_id on payload')
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
