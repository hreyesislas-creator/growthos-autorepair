/**
 * Telnyx V2 webhook Ed25519 verification.
 * Signed message: `${telnyx-timestamp}|${rawRequestBody}` (UTF-8 bytes).
 * Signature header: base64-encoded Ed25519 signature (64 bytes when decoded).
 */

import { createPublicKey, verify } from 'node:crypto'

/** SPKI prefix for a raw 32-byte Ed25519 public key (RFC 8410). */
const ED25519_RAW_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

export type VerifyTelnyxWebhookResult =
  | { ok: true }
  | { ok: false; error: 'missing_signature' }
  | { ok: false; error: 'invalid_signature' }

function parseTelnyxPublicKey(material: string): ReturnType<typeof createPublicKey> {
  const trimmed = material.trim().replace(/\r\n/g, '\n')
  if (!trimmed) {
    throw new Error('empty_public_key')
  }

  if (trimmed.includes('BEGIN PUBLIC KEY') || trimmed.includes('BEGIN')) {
    return createPublicKey({ key: trimmed, format: 'pem' })
  }

  const b64Compact = trimmed.replace(/\s+/g, '')
  const decoded = Buffer.from(b64Compact, 'base64')
  if (decoded.length === 0) {
    throw new Error('invalid_public_key_encoding')
  }

  if (decoded.length === 32) {
    return createPublicKey({
      key: Buffer.concat([ED25519_RAW_SPKI_PREFIX, decoded]),
      format: 'der',
      type: 'spki',
    })
  }

  try {
    return createPublicKey({ key: decoded, format: 'der', type: 'spki' })
  } catch {
    return createPublicKey({
      key: `-----BEGIN PUBLIC KEY-----\n${b64Compact}\n-----END PUBLIC KEY-----`,
      format: 'pem',
    })
  }
}

/**
 * Verifies the Telnyx Ed25519 webhook signature.
 *
 * @param rawBody - Exact raw body string from the request (no trim for signing).
 * @param publicKeyEnv - `TELNYX_PUBLIC_KEY`: PEM block or base64 (32-byte raw, or SPKI DER).
 */
export function verifyTelnyxWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  timestampHeader: string | null,
  publicKeyEnv: string | undefined
): VerifyTelnyxWebhookResult {
  const sigHeader = signatureHeader?.trim() ?? ''
  const tsHeader = timestampHeader?.trim() ?? ''
  if (!sigHeader || !tsHeader) {
    return { ok: false, error: 'missing_signature' }
  }

  const keyMaterial = publicKeyEnv?.trim()
  if (!keyMaterial) {
    return { ok: false, error: 'invalid_signature' }
  }

  let publicKey: ReturnType<typeof createPublicKey>
  try {
    publicKey = parseTelnyxPublicKey(keyMaterial)
  } catch {
    return { ok: false, error: 'invalid_signature' }
  }

  let signature: Buffer
  try {
    const sigB64 = sigHeader.replace(/\s+/g, '')
    signature = Buffer.from(sigB64, 'base64')
    if (signature.length === 0) {
      return { ok: false, error: 'invalid_signature' }
    }
  } catch {
    return { ok: false, error: 'invalid_signature' }
  }

  const message = Buffer.from(`${tsHeader}|${rawBody}`, 'utf8')

  try {
    const valid = verify(null, message, publicKey, signature)
    if (!valid) {
      return { ok: false, error: 'invalid_signature' }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'invalid_signature' }
  }
}
