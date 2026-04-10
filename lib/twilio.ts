/**
 * Twilio helper functions for call handling and SMS messaging.
 * Phase 1: Basic SMS sending for missed-call follow-ups.
 */

import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER
const shopName = process.env.SHOP_NAME || 'Our Shop'
const shopPhoneDisplay = process.env.SHOP_PHONE_DISPLAY || twilioPhoneNumber

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.warn('[Twilio] Missing required env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER')
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null

/**
 * Send a missed-call follow-up SMS to the caller.
 * Phase 1: Hard-coded message template.
 * Phase 2: TODO - Make message template configurable per tenant.
 *
 * @param toNumber Caller's phone number (E.164 format, e.g., +14155552671)
 * @returns Promise resolving to SMS SID if sent, null if skipped
 */
export async function sendMissedCallSMS(toNumber: string): Promise<string | null> {
  // Check if SMS sending is enabled
  if (process.env.TWILIO_SMS_ENABLED !== 'true') {
    console.log('[Twilio SMS] Skipped - SMS disabled', { toNumber })
    return null
  }

  // Validate Twilio client is initialized
  if (!client) {
    console.error('[Twilio SMS] Client not initialized - missing env vars')
    return null
  }

  // Validate phone number
  if (!toNumber || typeof toNumber !== 'string' || !toNumber.startsWith('+')) {
    console.warn('[Twilio SMS] Invalid phone number', { toNumber })
    return null
  }

  // Hard-coded message template for Phase 1
  // TODO: Make configurable per tenant in Phase 2
  const message = `Hi, we missed your call. This is ${shopName}. Reply here and we'll get back to you.`

  try {
    const sms = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: toNumber,
    })

    console.log('[Twilio SMS] Sent successfully', {
      sid: sms.sid,
      to: toNumber,
      from: twilioPhoneNumber,
      status: sms.status,
    })

    return sms.sid
  } catch (error) {
    console.error('[Twilio SMS] Failed to send', {
      toNumber,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Normalize a phone number to E.164 format.
 * Phase 1: Simple validation - assumes input is already reasonably formatted.
 * Phase 2: TODO - Add comprehensive phone number parsing and validation.
 *
 * @param phoneNumber Raw phone number
 * @returns Normalized E.164 format, or null if invalid
 */
export function normalizePhoneNumber(phoneNumber: string | null | undefined): string | null {
  if (!phoneNumber || typeof phoneNumber !== 'string') return null

  // Remove common formatting characters
  const cleaned = phoneNumber.replace(/[\s\-()]/g, '')

  // If already in E.164 format, return as-is
  if (cleaned.startsWith('+')) {
    if (/^\+\d{10,15}$/.test(cleaned)) {
      return cleaned
    }
    return null
  }

  // If starts with 1 (US country code), prepend +
  if (cleaned.startsWith('1') && /^\d{10,11}$/.test(cleaned)) {
    return `+${cleaned}`
  }

  // If 10-digit US number without country code, prepend +1
  if (/^\d{10}$/.test(cleaned)) {
    return `+1${cleaned}`
  }

  // Phase 2: TODO - Support international numbers with more sophisticated parsing
  console.warn('[Twilio] Could not normalize phone number', { phoneNumber, cleaned })
  return null
}
