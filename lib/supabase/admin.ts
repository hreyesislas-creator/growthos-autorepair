/**
 * Supabase Admin Client (Service Role)
 *
 * REQUIRES env var: SUPABASE_SERVICE_ROLE_KEY
 * Never expose this key on the client. Use only in server-side code / Server Actions.
 */
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url)        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  if (!serviceKey) throw new Error(
    'Missing SUPABASE_SERVICE_ROLE_KEY — required for admin operations (invite user, etc.)'
  )

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken:  false,
      persistSession:    false,
    },
  })
}
