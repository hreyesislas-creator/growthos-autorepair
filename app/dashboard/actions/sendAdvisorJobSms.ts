'use server'

export type SendAdvisorJobSmsResult = { ok: false; message: string }

/**
 * Phase 2A placeholder — no SMS, no DB, no Telnyx/Twilio.
 * Wire real send + validation in a later phase.
 */
export async function sendAdvisorJobSms(): Promise<SendAdvisorJobSmsResult> {
  return { ok: false, message: 'Not implemented' }
}
