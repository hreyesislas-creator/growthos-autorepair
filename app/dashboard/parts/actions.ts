'use server'

import { denyUnlessCanEditDashboardModule } from '@/lib/auth/roles'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardTenant } from '@/lib/tenant'
import type { PartsCatalog } from '@/lib/types'

export interface PartsCatalogWriteInput {
  part_number?: string | null
  name: string
  description?: string | null
  default_unit_cost?: number | null
  default_unit_price?: number | null
}

export async function createPart(
  input: PartsCatalogWriteInput,
): Promise<{ data: PartsCatalog } | { error: string }> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const denied = await denyUnlessCanEditDashboardModule('parts')
  if (denied) return denied

  const name = (input.name ?? '').trim()
  if (!name) return { error: 'Name is required' }

  const admin = await createAdminClient()
  const tenantId = ctx.tenant.id

  const { data, error } = await admin
    .from('parts_catalog')
    .insert({
      tenant_id:            tenantId,
      part_number:          input.part_number?.trim() || null,
      name,
      description:          input.description?.trim() || null,
      default_unit_cost:    input.default_unit_cost ?? null,
      default_unit_price:   input.default_unit_price ?? null,
      is_active:            true,
    })
    .select()
    .single()

  if (error) {
    console.error('[createPart]', error.message)
    return { error: error.message }
  }

  return { data: data as PartsCatalog }
}

export async function updatePart(
  id: string,
  input: Partial<PartsCatalogWriteInput> & { is_active?: boolean },
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const denied = await denyUnlessCanEditDashboardModule('parts')
  if (denied) return denied

  if (!id?.trim()) return { error: 'Invalid part id' }

  const admin = await createAdminClient()
  const tenantId = ctx.tenant.id

  const patch: Record<string, unknown> = {}

  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) return { error: 'Name is required' }
    patch.name = name
  }
  if (input.part_number !== undefined) {
    patch.part_number = input.part_number?.trim() || null
  }
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null
  }
  if (input.default_unit_cost !== undefined) {
    patch.default_unit_cost = input.default_unit_cost
  }
  if (input.default_unit_price !== undefined) {
    patch.default_unit_price = input.default_unit_price
  }
  if (input.is_active !== undefined) {
    patch.is_active = input.is_active
  }

  if (Object.keys(patch).length === 0) return null

  const { error } = await admin
    .from('parts_catalog')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[updatePart]', error.message)
    return { error: error.message }
  }

  return null
}

export async function deletePart(partId: string): Promise<{ error: string } | null> {
  return updatePart(partId, { is_active: false })
}
