/**
 * Fixed-text auto-reply after a new inbound SMS row is stored.
 * Rate-limited per conversation (no Telnyx outbound in last 5 minutes).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

import type { ExtractedTelnyxInboundMessage } from '@/lib/telnyx/extractInboundMessage'
import {
  sendTelnyxMessage,
  telnyxProviderMessageIdFromSendResponse,
} from '@/lib/telnyx/sendTelnyxMessage'

const OUTBOUND_COOLDOWN_MS = 5 * 60 * 1000

export async function maybeSendInboundAutoReply(
  supabase: SupabaseClient,
  params: {
    tenantId: string
    conversationId: string
    extracted: ExtractedTelnyxInboundMessage
  }
): Promise<void> {
  const { tenantId, conversationId, extracted } = params
  const fromPhone = extracted.fromPhone
  const toPhone = extracted.toPhone
  if (!fromPhone || !toPhone) {
    return
  }

  const { data: settings, error: settingsError } = await supabase
    .from('sms_auto_reply_settings')
    .select('is_enabled, reply_text')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (settingsError) {
    console.error('[Telnyx SMS Inbound] sms_auto_reply_settings lookup failed', {
      error: settingsError.message,
      code: settingsError.code,
      tenantId,
    })
    return
  }

  if (!settings || !settings.is_enabled) {
    return
  }

  const replyText =
    typeof settings.reply_text === 'string' ? settings.reply_text.trim() : ''
  if (!replyText) {
    return
  }

  const cutoffIso = new Date(Date.now() - OUTBOUND_COOLDOWN_MS).toISOString()
  const { data: recentOutbound, error: recentError } = await supabase
    .from('sms_messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('direction', 'outbound')
    .eq('provider', 'telnyx')
    .gte('created_at', cutoffIso)
    .limit(1)
    .maybeSingle()

  if (recentError) {
    console.error('[Telnyx SMS Inbound] Auto-reply cooldown query failed', {
      error: recentError.message,
      code: recentError.code,
      conversationId,
    })
    return
  }

  if (recentOutbound?.id) {
    console.warn('[Telnyx SMS Inbound] Skipping auto-reply: recent outbound within 5 minutes', {
      conversationId,
      tenantId,
    })
    return
  }

  console.log('[AUTO REPLY] Attempting send', {
    from: toPhone,
    to: fromPhone,
    text: replyText,
  })

  const sendResult = await sendTelnyxMessage({
    from: toPhone,
    to: fromPhone,
    text: replyText,
  })

  if (!sendResult.ok) {
    console.error(
      '[AUTO REPLY] Send failed',
      sendResult.json ?? sendResult.error
    )
    console.error('[Telnyx SMS Inbound] Auto-reply send failed', {
      error: sendResult.error,
      status: sendResult.status,
      tenantId,
      conversationId,
      response: sendResult.json,
    })
    return
  }

  console.log('[AUTO REPLY] Send success', sendResult.json)

  const providerMessageId = telnyxProviderMessageIdFromSendResponse(sendResult.json)

  const { error: outError } = await supabase.from('sms_messages').insert({
    tenant_id: tenantId,
    conversation_id: conversationId,
    direction: 'outbound',
    message_text: replyText,
    provider: 'telnyx',
    provider_message_id: providerMessageId,
    provider_event_id: null,
    from_phone: toPhone,
    to_phone: fromPhone,
    raw_payload: sendResult.json,
  })

  if (outError) {
    console.error('[Telnyx SMS Inbound] Failed to persist outbound sms_messages after auto-reply', {
      error: outError.message,
      code: outError.code,
      conversationId,
      tenantId,
    })
  }
}
