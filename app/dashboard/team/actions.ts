'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { getDashboardTenant } from '@/lib/tenant'

const VALID_ROLES = ['admin', 'advisor', 'technician', 'viewer'] as const
type Role = typeof VALID_ROLES[number]

export async function inviteUser(
  formData: FormData
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const email    = String(formData.get('email')     ?? '').trim().toLowerCase()
  const role     = String(formData.get('role')      ?? '').trim() as Role
  const fullName = String(formData.get('full_name') ?? '').trim() || null
  const langPref = String(formData.get('language_pref') ?? 'en').trim()

  if (!email)               return { error: 'Email is required' }
  if (!email.includes('@')) return { error: 'Enter a valid email address' }
  if (!VALID_ROLES.includes(role)) return { error: 'Invalid role selected' }

  // Check if already a member of this tenant
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('tenant_id', ctx.tenant.id)
    .eq('email', email)
    .maybeSingle()

  if (existing) return { error: 'This email is already a member of your team' }

  // Send Supabase invite — requires SUPABASE_SERVICE_ROLE_KEY
  let adminClient: ReturnType<typeof createAdminClient>
  try {
    adminClient = createAdminClient()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { error: msg }
  }

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        full_name:  fullName,
        tenant_id:  ctx.tenant.id,
        role,
      },
      // Redirect user to dashboard after they accept
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/dashboard`,
    }
  )

  if (inviteError) return { error: inviteError.message }

  const invitedUserId = inviteData?.user?.id
  if (!invitedUserId) return { error: 'Invite sent but could not retrieve user ID' }

  // Create the tenant_users record so the user has the correct role on login
  const { error: insertError } = await supabase.from('tenant_users').insert({
    tenant_id:     ctx.tenant.id,
    user_id:       invitedUserId,
    email,
    full_name:     fullName ?? '',
    role,
    language_pref: langPref === 'es' ? 'es' : 'en',
    is_active:     false, // becomes true once they accept and we receive the event
    phone:         null,
  })

  if (insertError) return { error: insertError.message }

  return null
}
