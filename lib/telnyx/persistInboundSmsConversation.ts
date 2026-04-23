/**
 * Normalized SMS layer: find/create conversation + insert inbound message (Telnyx).
 * Service-role client only; duplicate provider_event_id is ignored (idempotent).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

import type { ExtractedTelnyxInboundMessage } from '@/lib/telnyx/extractInboundMessage'

const PG_UNIQUE_VIOLATION = '23505'

export type PersistInboundSmsConversationResult = {
  conversationId: string | null
  inboundMessageInserted: boolean
}

async function ensureConversationId(
  supabase: SupabaseClient,
  tenantId: string,
  customerPhone: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('sms_conversations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('customer_phone', customerPhone)
    .maybeSingle()

  if (existing?.id) {
    return existing.id as string
  }

  const { data: inserted, error } = await supabase
    .from('sms_conversations')
    .insert({ tenant_id: tenantId, customer_phone: customerPhone })
    .select('id')
    .single()

  if (!error && inserted?.id) {
    return inserted.id as string
  }

  if (error?.code === PG_UNIQUE_VIOLATION) {
    const { data: again } = await supabase
      .from('sms_conversations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('customer_phone', customerPhone)
      .maybeSingle()
    return (again?.id as string) ?? null
  }

  console.error('[Telnyx SMS Inbound] Failed to create sms_conversation', {
    error: error?.message,
    code: error?.code,
    tenantId,
    customerPhone,
  })
  return null
}

export async function persistInboundSmsConversation(
  supabase: SupabaseClient,
  params: {
    tenantId: string
    extracted: ExtractedTelnyxInboundMessage
    payload: Record<string, unknown>
  }
): Promise<PersistInboundSmsConversationResult> {
  const { tenantId, extracted, payload } = params
  const fromPhone = extracted.fromPhone
  if (!fromPhone) {
    return { conversationId: null, inboundMessageInserted: false }
  }

  const conversationId = await ensureConversationId(supabase, tenantId, fromPhone)
  if (!conversationId) {
    return { conversationId: null, inboundMessageInserted: false }
  }

  const nowIso = new Date().toISOString()

  const { error: msgError } = await supabase.from('sms_messages').insert({
    tenant_id: tenantId,
    conversation_id: conversationId,
    direction: 'inbound',
    message_text: extracted.text,
    provider: 'telnyx',
    provider_message_id: extracted.messageId,
    provider_event_id: extracted.eventId,
    from_phone: extracted.fromPhone,
    to_phone: extracted.toPhone,
    raw_payload: payload,
  })

  if (msgError) {
    if (msgError.code === PG_UNIQUE_VIOLATION) {
      console.log('[Telnyx SMS Inbound] Duplicate sms message (provider_event_id)', {
        provider: 'telnyx',
        provider_event_id: extracted.eventId,
      })
    } else {
      console.error('[Telnyx SMS Inbound] Failed to insert sms_messages', {
        error: msgError.message,
        code: msgError.code,
        conversationId,
      })
    }
    return { conversationId, inboundMessageInserted: false }
  }

  const { error: convUpdateError } = await supabase
    .from('sms_conversations')
    .update({ last_message_at: nowIso, updated_at: nowIso })
    .eq('id', conversationId)

  if (convUpdateError) {
    console.error('[Telnyx SMS Inbound] Failed to update sms_conversations timestamps', {
      error: convUpdateError.message,
      code: convUpdateError.code,
      conversationId,
    })
  }

  return { conversationId, inboundMessageInserted: true }
}
