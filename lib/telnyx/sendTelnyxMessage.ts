/**
 * Outbound SMS via Telnyx Messaging API (v2).
 */

const TELNYX_MESSAGES_URL = 'https://api.telnyx.com/v2/messages'

export type TelnyxSendMessageResult =
  | { ok: true; json: Record<string, unknown> }
  | { ok: false; error: string; status?: number; json?: Record<string, unknown> }

/** Telnyx wraps the message in `data`; message id is `data.id`. */
export function telnyxProviderMessageIdFromSendResponse(
  json: Record<string, unknown>
): string | null {
  const data = json.data
  if (!data || typeof data !== 'object') return null
  const id = (data as { id?: unknown }).id
  return typeof id === 'string' ? id : null
}

export async function sendTelnyxMessage(params: {
  from: string
  to: string
  text: string
}): Promise<TelnyxSendMessageResult> {
  const apiKey = process.env.TELNYX_API_KEY?.trim()
  if (!apiKey) {
    return { ok: false, error: 'TELNYX_API_KEY is not set' }
  }

  let res: Response
  try {
    res = await fetch(TELNYX_MESSAGES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: params.from,
        to: params.to,
        text: params.text,
      }),
    })
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  let json: Record<string, unknown>
  try {
    json = (await res.json()) as Record<string, unknown>
  } catch {
    return { ok: false, error: 'Telnyx response was not valid JSON', status: res.status }
  }

  if (!res.ok) {
    return {
      ok: false,
      error: `Telnyx API error HTTP ${res.status}`,
      status: res.status,
      json,
    }
  }

  return { ok: true, json }
}
