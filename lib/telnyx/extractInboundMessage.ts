/**
 * Telnyx Messaging API webhook — inbound message field extraction.
 * Shape aligned with production message.received payloads.
 */

export type ExtractedTelnyxInboundMessage = {
  eventId: string | null
  eventType: string | null
  messageId: string | null
  fromPhone: string | null
  toPhone: string | null
  text: string | null
  direction: string | null
  receivedAt: string | null
  occurredAt: string | null
  messagingProfileId: string | null
}

export const emptyExtractedTelnyxInboundMessage = (): ExtractedTelnyxInboundMessage => ({
  eventId: null,
  eventType: null,
  messageId: null,
  fromPhone: null,
  toPhone: null,
  text: null,
  direction: null,
  receivedAt: null,
  occurredAt: null,
  messagingProfileId: null,
})

function readString(v: unknown): string | null {
  return typeof v === 'string' ? v : null
}

export function extractTelnyxInboundMessage(body: unknown): ExtractedTelnyxInboundMessage {
  const empty = emptyExtractedTelnyxInboundMessage()

  if (!body || typeof body !== 'object') return empty

  const root = body as Record<string, unknown>
  const data = root.data
  if (!data || typeof data !== 'object') return empty

  const d = data as Record<string, unknown>
  const eventId = readString(d.id)
  const eventType = readString(d.event_type)
  const occurredAt = readString(d.occurred_at)

  const inner = d.payload
  if (!inner || typeof inner !== 'object') {
    return { ...empty, eventId, eventType, occurredAt }
  }

  const p = inner as Record<string, unknown>
  const messageId = readString(p.id)
  const text = readString(p.text)
  const direction = readString(p.direction)
  const receivedAt = readString(p.received_at)
  const messagingProfileId = readString(p.messaging_profile_id)

  let fromPhone: string | null = null
  const fromVal = p.from
  if (fromVal && typeof fromVal === 'object') {
    fromPhone = readString((fromVal as { phone_number?: unknown }).phone_number)
  }

  let toPhone: string | null = null
  const toVal = p.to
  if (Array.isArray(toVal) && toVal.length > 0) {
    const first = toVal[0]
    if (first && typeof first === 'object') {
      toPhone = readString((first as { phone_number?: unknown }).phone_number)
    }
  }

  return {
    eventId,
    eventType,
    messageId,
    fromPhone,
    toPhone,
    text,
    direction,
    receivedAt,
    occurredAt,
    messagingProfileId,
  }
}
