'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { getDashboardTenant } from '@/lib/tenant'

const VALID_ROLES = ['admin', 'advisor', 'technician', 'viewer'] as const
type Role = typeof VALID_ROLES[number]

/** TEMP: diagnostic prefix for Vercel logs — search this string to filter. */
const TEAM_INVITE_LOG_PREFIX = '[team-invite:diag]'

function hasServiceRoleKeyEnv(): boolean {
  const v = process.env.SUPABASE_SERVICE_ROLE_KEY
  return typeof v === 'string' && v.length > 0
}

/** Serializable error fields for logs — never includes secrets. */
function serializeErrorForLog(err: unknown): Record<string, unknown> {
  if (err == null) return { detail: 'null_or_undefined' }
  if (err instanceof Error) {
    const o: Record<string, unknown> = {
      name: err.name,
      message: err.message,
    }
    const any = err as Error & {
      status?: number
      code?: string
      __isAuthError?: boolean
    }
    if (typeof any.status === 'number') o.status = any.status
    if (any.code !== undefined) o.code = any.code
    if (any.__isAuthError !== undefined) o.__isAuthError = any.__isAuthError
    return o
  }
  if (typeof err === 'object') {
    try {
      return JSON.parse(JSON.stringify(err)) as Record<string, unknown>
    } catch {
      return { stringified: String(err) }
    }
  }
  return { value: String(err) }
}

export async function inviteUser(
  formData: FormData
): Promise<{ error: string } | null> {
  console.log(
    TEAM_INVITE_LOG_PREFIX,
    'start',
    JSON.stringify({ step: 'inviteUser_start', ts: new Date().toISOString() }),
  )

  const ctx = await getDashboardTenant()
  if (!ctx) {
    console.log(
      TEAM_INVITE_LOG_PREFIX,
      'early_exit',
      JSON.stringify({ reason: 'no_dashboard_tenant_context' }),
    )
    return { error: 'Not authorized' }
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const role = String(formData.get('role') ?? '').trim() as Role
  const fullName = String(formData.get('full_name') ?? '').trim() || null
  const langPref = String(formData.get('language_pref') ?? 'en').trim()

  console.log(
    TEAM_INVITE_LOG_PREFIX,
    'parsed_form',
    JSON.stringify({
      step: 'after_parse',
      tenantId: ctx.tenant.id,
      tenantSlug: ctx.tenant.slug,
      inviteEmail: email,
      role,
      languagePrefRaw: langPref,
      hasFullNameField: fullName != null && fullName.length > 0,
      supabaseServiceRoleKeyPresent: hasServiceRoleKeyEnv(),
    }),
  )

  if (!email) {
    console.log(TEAM_INVITE_LOG_PREFIX, 'early_exit', JSON.stringify({ reason: 'validation_email_empty' }))
    return { error: 'Email is required' }
  }
  if (!email.includes('@')) {
    console.log(TEAM_INVITE_LOG_PREFIX, 'early_exit', JSON.stringify({ reason: 'validation_email_invalid' }))
    return { error: 'Enter a valid email address' }
  }
  if (!VALID_ROLES.includes(role)) {
    console.log(TEAM_INVITE_LOG_PREFIX, 'early_exit', JSON.stringify({ reason: 'validation_role_invalid', role }))
    return { error: 'Invalid role selected' }
  }

  // Check if already a member of this tenant
  const supabase = await createClient()
  const { data: existing, error: existingLookupError } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('tenant_id', ctx.tenant.id)
    .eq('email', email)
    .maybeSingle()

  if (existingLookupError) {
    console.log(
      TEAM_INVITE_LOG_PREFIX,
      'tenant_users_duplicate_lookup',
      JSON.stringify({
        step: 'duplicate_check_error',
        error: serializeErrorForLog(existingLookupError),
      }),
    )
  }

  if (existing) {
    console.log(
      TEAM_INVITE_LOG_PREFIX,
      'early_exit',
      JSON.stringify({ reason: 'already_member', inviteEmail: email }),
    )
    return { error: 'This email is already a member of your team' }
  }

  // Send Supabase invite — requires SUPABASE_SERVICE_ROLE_KEY
  let adminClient: ReturnType<typeof createAdminClient>
  try {
    adminClient = createAdminClient()
    console.log(
      TEAM_INVITE_LOG_PREFIX,
      'admin_client',
      JSON.stringify({ step: 'createAdminClient_ok', supabaseServiceRoleKeyPresent: hasServiceRoleKeyEnv() }),
    )
  } catch (e: unknown) {
    console.log(
      TEAM_INVITE_LOG_PREFIX,
      'admin_client',
      JSON.stringify({
        step: 'createAdminClient_throw',
        supabaseServiceRoleKeyPresent: hasServiceRoleKeyEnv(),
        error: serializeErrorForLog(e),
      }),
    )
    const msg = e instanceof Error ? e.message : String(e)
    return { error: msg }
  }

  const lang = langPref === 'es' ? 'es' : 'en'

  console.log(
    TEAM_INVITE_LOG_PREFIX,
    'auth_invite_call',
    JSON.stringify({
      step: 'before_inviteUserByEmail',
      inviteEmail: email,
      redirectToHostSet: Boolean(process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.length > 0),
    }),
  )

  try {
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name: fullName,
          tenant_id: ctx.tenant.id,
          role,
          preferred_language: lang, // Auth user_metadata; tenant_users may not have a language column
        },
        // Redirect user to dashboard after they accept
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=${encodeURIComponent('/auth/set-password')}`,
      },
    )

    console.log(
      TEAM_INVITE_LOG_PREFIX,
      'auth_invite_result',
      JSON.stringify({
        step: 'after_inviteUserByEmail',
        hasError: inviteError != null,
        error: inviteError ? serializeErrorForLog(inviteError) : null,
        dataSummary: inviteData
          ? {
              hasUser: inviteData.user != null,
              userId: inviteData.user?.id ?? null,
            }
          : null,
      }),
    )

    if (inviteError) {
      const err = inviteError as { message: string; status?: number; code?: string }
      console.error('[inviteUserByEmail] error:', {
        message: err.message,
        status: err.status,
        code: err.code,
      })
      const msgLower = (err.message ?? '').toLowerCase()
      const isRateLimit = err.status === 429 || msgLower.includes('rate limit')
      if (isRateLimit) {
        return {
          error: 'Invite email rate limit reached. Please wait a few minutes and try again.',
        }
      }
      if (msgLower.includes('already been registered')) {
        let existingAuthUser: { id: string; email?: string | undefined } | undefined
        let page = 1
        const perPage = 1000
        for (;;) {
          const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers({ page, perPage })
          if (listErr) {
            console.log(
              TEAM_INVITE_LOG_PREFIX,
              'early_exit',
              JSON.stringify({
                reason: 'supabase_auth_admin_listUsers_failed',
                inviteEmail: email,
                error: serializeErrorForLog(listErr),
              }),
            )
            return { error: err.message }
          }
          const users = listData?.users ?? []
          existingAuthUser = users.find(u => (u.email ?? '').toLowerCase() === email)
          if (existingAuthUser) break
          if (users.length < perPage) break
          page += 1
        }
        if (!existingAuthUser) {
          console.log(
            TEAM_INVITE_LOG_PREFIX,
            'early_exit',
            JSON.stringify({
              reason: 'already_registered_auth_user_not_found',
              inviteEmail: email,
            }),
          )
          return { error: err.message }
        }
        const { data: existingMembership } = await supabase
          .from('tenant_users')
          .select('id')
          .eq('tenant_id', ctx.tenant.id)
          .eq('auth_user_id', existingAuthUser.id)
          .maybeSingle()

        if (existingMembership) {
          return { error: 'User is already part of this team.' }
        }
        const fullNameTrimmed = (fullName ?? '').trim()
        let existingFirstName: string
        let existingLastName: string
        if (fullNameTrimmed.length > 0) {
          const parts = fullNameTrimmed.split(/\s+/)
          existingFirstName = parts[0] ?? ''
          existingLastName = parts.slice(1).join(' ') || '-'
        } else {
          existingFirstName = email.split('@')[0] || email
          existingLastName = '-'
        }
        const tenantUsersDbRole =
          role === 'technician' || role === 'viewer'
            ? 'advisor'
            : role === 'admin'
              ? 'manager'
              : role
        console.log(
          TEAM_INVITE_LOG_PREFIX,
          'debug_role_mapping',
          JSON.stringify({
            rawRole: role,
            tenantUsersDbRole,
            inviteEmail: email,
          }),
        )
        const { error: insertExistingError } = await supabase.from('tenant_users').insert({
          tenant_id: ctx.tenant.id,
          auth_user_id: existingAuthUser.id,
          email,
          role: tenantUsersDbRole,
          is_active: true,
          first_name: existingFirstName,
          last_name: existingLastName,
        })
        if (insertExistingError) {
          console.log(
            TEAM_INVITE_LOG_PREFIX,
            'early_exit',
            JSON.stringify({
              reason: 'tenant_users_insert_failed',
              inviteEmail: email,
              invitedUserId: existingAuthUser.id,
              error: serializeErrorForLog(insertExistingError),
            }),
          )
          return { error: insertExistingError.message }
        }
        console.log(
          TEAM_INVITE_LOG_PREFIX,
          'success',
          JSON.stringify({
            step: 'invite_complete',
            inviteEmail: email,
            invitedUserId: existingAuthUser.id,
          }),
        )
        return null
      }
      console.log(
        TEAM_INVITE_LOG_PREFIX,
        'early_exit',
        JSON.stringify({
          reason: 'supabase_auth_admin_invite_failed',
          inviteEmail: email,
          error: serializeErrorForLog(inviteError),
        }),
      )
      return { error: err.message }
    }

    const invitedUserId = inviteData?.user?.id
    if (!invitedUserId) {
      console.log(
        TEAM_INVITE_LOG_PREFIX,
        'early_exit',
        JSON.stringify({
          reason: 'invite_ok_but_no_user_id',
          inviteEmail: email,
          dataSummary: inviteData ? { keys: Object.keys(inviteData as object) } : null,
        }),
      )
      return { error: 'Invite sent but could not retrieve user ID' }
    }

    console.log(
      TEAM_INVITE_LOG_PREFIX,
      'tenant_users_insert',
      JSON.stringify({
        step: 'before_tenant_users_insert',
        inviteEmail: email,
        invitedUserId,
      }),
    )

    // Create the tenant_users record so the user has the correct role on login.
    // Omit full_name and language_pref if those columns are absent from tenant_users (schema cache).
    // Language is stored on the invited Auth user as preferred_language in data above.
    const inviteNameTrimmed = (fullName ?? '').trim()
    let inviteFirstName: string
    let inviteLastName: string
    if (inviteNameTrimmed.length > 0) {
      const parts = inviteNameTrimmed.split(/\s+/)
      inviteFirstName = parts[0] ?? ''
      inviteLastName = parts.slice(1).join(' ') || '-'
    } else {
      inviteFirstName = email.split('@')[0] || email
      inviteLastName = '-'
    }
    const tenantUsersDbRole =
      role === 'technician' || role === 'viewer'
        ? 'advisor'
        : role === 'admin'
          ? 'manager'
          : role
    const { error: insertError } = await supabase.from('tenant_users').insert({
      tenant_id: ctx.tenant.id,
      auth_user_id: invitedUserId,
      email,
      role: tenantUsersDbRole,
      is_active: true,
      phone: null,
      first_name: inviteFirstName,
      last_name: inviteLastName,
    })

    console.log(
      TEAM_INVITE_LOG_PREFIX,
      'tenant_users_insert_result',
      JSON.stringify({
        step: 'after_tenant_users_insert',
        insertAttempted: true,
        hasError: insertError != null,
        error: insertError ? serializeErrorForLog(insertError) : null,
      }),
    )

    if (insertError) {
      console.log(
        TEAM_INVITE_LOG_PREFIX,
        'early_exit',
        JSON.stringify({
          reason: 'tenant_users_insert_failed',
          inviteEmail: email,
          invitedUserId,
          error: serializeErrorForLog(insertError),
        }),
      )
      return { error: insertError.message }
    }

    console.log(
      TEAM_INVITE_LOG_PREFIX,
      'success',
      JSON.stringify({ step: 'invite_complete', inviteEmail: email, invitedUserId }),
    )
    return null
  } catch (unexpected: unknown) {
    console.log(
      TEAM_INVITE_LOG_PREFIX,
      'unexpected_throw',
      JSON.stringify({
        step: 'uncaught_exception',
        inviteEmail: email,
        error: serializeErrorForLog(unexpected),
      }),
    )
    throw unexpected
  }
}

export async function deactivateTeamMember(
  tenantUserId: string,
): Promise<{ success: true } | { error: string }> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const id = tenantUserId?.trim()
  if (!id) return { error: 'Invalid user' }

  const supabase = await createClient()

  const { data: row, error: fetchErr } = await supabase
    .from('tenant_users')
    .select('id, role, tenant_id')
    .eq('id', id)
    .eq('tenant_id', ctx.tenant.id)
    .maybeSingle()

  if (fetchErr) return { error: fetchErr.message }
  if (!row) return { error: 'Team member not found.' }
  if (row.role === 'owner') return { error: 'Owner cannot be deactivated.' }

  const { error: updateErr } = await supabase
    .from('tenant_users')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', ctx.tenant.id)

  if (updateErr) return { error: updateErr.message }
  return { success: true }
}
