'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDashboardTenant } from '@/lib/tenant'
import { canManageShopAnnouncements } from '@/lib/auth/role-access'
import { getCurrentAppRoleForTenant } from '@/lib/auth/roles'
import { getCurrentDashboardTenantUser } from '@/lib/auth/operational-assignment'

export async function createShopAnnouncement(formData: FormData): Promise<void> {
  const ctx = await getDashboardTenant()
  if (!ctx) return

  const role = await getCurrentAppRoleForTenant()
  if (!canManageShopAnnouncements(role)) return

  const title = String(formData.get('title') ?? '').trim()
  const message = String(formData.get('message') ?? '').trim()
  if (!title || !message) return

  const du = await getCurrentDashboardTenantUser()
  const supabase = await createClient()
  const { error } = await supabase.from('shop_announcements').insert({
    tenant_id: ctx.tenant.id,
    title,
    message,
    created_by: du?.tenantUserId ?? null,
  })

  if (error) {
    console.error('[createShopAnnouncement]', error.message)
    return
  }

  revalidatePath('/dashboard/announcements')
  revalidatePath('/dashboard')
}

export async function deleteShopAnnouncement(announcementId: string, _formData: FormData): Promise<void> {
  const ctx = await getDashboardTenant()
  if (!ctx) return

  const role = await getCurrentAppRoleForTenant()
  if (!canManageShopAnnouncements(role)) return

  const supabase = await createClient()
  const { error } = await supabase
    .from('shop_announcements')
    .delete()
    .eq('id', announcementId)
    .eq('tenant_id', ctx.tenant.id)

  if (error) {
    console.error('[deleteShopAnnouncement]', error.message)
    return
  }

  revalidatePath('/dashboard/announcements')
  revalidatePath('/dashboard')
}
