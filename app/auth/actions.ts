'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * After invitee sets password on /auth/set-password, mark their tenant membership(s)
 * as onboarded. Idempotent: only rows with invite_status = 'pending' are updated.
 * Legacy rows (NULL invite_status) are untouched.
 */
export async function markTenantInviteAccepted(): Promise<{ error: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) return { error: 'Not signed in' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('tenant_users')
    .update({ invite_status: 'accepted' })
    .eq('auth_user_id', user.id)
    .eq('invite_status', 'pending')

  if (error) return { error: error.message }
  return null
}
