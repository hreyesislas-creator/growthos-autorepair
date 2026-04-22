/**
 * Telnyx inbound SMS webhook (v1).
 * Acknowledges message.received (and other) events with 200; logs payload for inspection.
 * No persistence or auto-replies yet.
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type ExtractedInbound = {
  eventType: string | null
  eventId: string | null
  messageId: string | null
  from: string | null
  to: string | null
  text: string | null
}

function extractTelnyxMessagingFields(body: unknown): ExtractedInbound {
  const empty: ExtractedInbound = {
    eventType: null,
    eventId: null,
    messageId: null,
    from: null,
    to: null,
    text: null,
  }

  if (!body || typeof body !== 'object') return empty

  const root = body as Record<string, unknown>
  const data = root.data
  if (!data || typeof data !== 'object') return empty

  const d = data as Record<string, unknown>
  const eventType = typeof d.event_type === 'string' ? d.event_type : null
  const eventId = typeof d.id === 'string' ? d.id : null

  const payload = d.payload
  if (!payload || typeof payload !== 'object') {
    return { ...empty, eventType, eventId }
  }

  const p = payload as Record<string, unknown>
  const messageId = typeof p.id === 'string' ? p.id : null

  let from: string | null = null
  const fromVal = p.from
  if (typeof fromVal === 'string') {
    from = fromVal
  } else if (fromVal && typeof fromVal === 'object') {
    const pn = (fromVal as { phone_number?: unknown }).phone_number
    if (typeof pn === 'string') from = pn
  }

  let to: string | null = null
  const toVal = p.to
  if (Array.isArray(toVal) && toVal.length > 0) {
    const first = toVal[0]
    if (first && typeof first === 'object') {
      const pn = (first as { phone_number?: unknown }).phone_number
      if (typeof pn === 'string') to = pn
    } else if (typeof first === 'string') {
      to = first
    }
  } else if (typeof toVal === 'string') {
    to = toVal
  }

  let text: string | null = null
  if (typeof p.text === 'string') {
    text = p.text
  } else if (p.body && typeof p.body === 'object' && p.body !== null) {
    const inner = (p.body as { text?: unknown }).text
    if (typeof inner === 'string') text = inner
  }

  return { eventType, eventId, messageId, from, to, text }
}

export async function POST(request: NextRequest) {
  const signaturePresent = Boolean(request.headers.get('telnyx-signature-ed25519'))
  const timestampHeader = request.headers.get('telnyx-timestamp')

  let rawText = ''
  try {
    rawText = await request.text()
  } catch (err) {
    console.error('[Telnyx SMS Inbound] Failed to read request body', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ ok: true, received: false, error: 'read_failed' }, { status: 200 })
  }

  let parsed: unknown = null
  let parseError: string | null = null

  const trimmed = rawText.trim()
  if (trimmed.length === 0) {
    console.warn('[Telnyx SMS Inbound] Empty body', {
      signaturePresent,
      telnyxTimestamp: timestampHeader,
    })
  } else {
    try {
      parsed = JSON.parse(trimmed) as unknown
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

  const extracted = parseError ? extractTelnyxMessagingFields(null) : extractTelnyxMessagingFields(parsed)

  console.log('[Telnyx SMS Inbound] Webhook received', {
    eventType: extracted.eventType,
    eventId: extracted.eventId,
    messageId: extracted.messageId,
    from: extracted.from,
    to: extracted.to,
    text: extracted.text,
    signaturePresent,
    telnyxTimestamp: timestampHeader,
  })

  return NextResponse.json(
    {
      ok: true,
      received: true,
      ...(parseError ? { parseError: true } : {}),
    },
    { status: 200 }
  )
}
