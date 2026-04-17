'use server'

import { denyUnlessCanEditDashboardModule } from '@/lib/auth/roles'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardTenant } from '@/lib/tenant'
import type { Json, ServiceCatalog } from '@/lib/types'

export interface ServiceCatalogWriteInput {
  name: string
  description?: string | null
  default_labor_hours?: number | null
  default_labor_rate?: number | null
  /** JSON array of `{ name, quantity?, unit_cost? }` or a JSON string */
  default_parts?: Json | unknown
  default_notes?: string | null
}

function normalizeDefaultParts(raw: unknown): Json {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw as Json
  if (typeof raw === 'string') {
    const t = raw.trim()
    if (t === '') return []
    try {
      const p = JSON.parse(t) as unknown
      return Array.isArray(p) ? (p as Json) : []
    } catch {
      return []
    }
  }
  return []
}

export async function createService(
  input: ServiceCatalogWriteInput,
): Promise<{ data: ServiceCatalog } | { error: string }> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const denied = await denyUnlessCanEditDashboardModule('estimates')
  if (denied) return denied

  const name = (input.name ?? '').trim()
  if (!name) return { error: 'Name is required' }

  const admin = await createAdminClient()
  const tenantId = ctx.tenant.id
  const defaultParts = normalizeDefaultParts(input.default_parts)

  const { data, error } = await admin
    .from('service_catalog')
    .insert({
      tenant_id:             tenantId,
      name,
      description:           input.description?.trim() || null,
      default_labor_hours:   input.default_labor_hours ?? null,
      default_labor_rate:    input.default_labor_rate ?? null,
      default_parts:         defaultParts,
      default_notes:         input.default_notes?.trim() || null,
      is_active:             true,
    })
    .select()
    .single()

  if (error) {
    console.error('[createService]', error.message)
    return { error: error.message }
  }

  return { data: data as ServiceCatalog }
}

export async function updateService(
  id: string,
  input: Partial<ServiceCatalogWriteInput> & { is_active?: boolean },
): Promise<{ error: string } | null> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const denied = await denyUnlessCanEditDashboardModule('estimates')
  if (denied) return denied

  if (!id?.trim()) return { error: 'Invalid service id' }

  const admin = await createAdminClient()
  const tenantId = ctx.tenant.id

  const patch: Record<string, unknown> = {}

  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) return { error: 'Name is required' }
    patch.name = name
  }
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null
  }
  if (input.default_labor_hours !== undefined) {
    patch.default_labor_hours = input.default_labor_hours
  }
  if (input.default_labor_rate !== undefined) {
    patch.default_labor_rate = input.default_labor_rate
  }
  if (input.default_parts !== undefined) {
    patch.default_parts = normalizeDefaultParts(input.default_parts)
  }
  if (input.default_notes !== undefined) {
    patch.default_notes = input.default_notes?.trim() || null
  }
  if (input.is_active !== undefined) {
    patch.is_active = input.is_active
  }

  if (Object.keys(patch).length === 0) return null

  const { error } = await admin
    .from('service_catalog')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[updateService]', error.message)
    return { error: error.message }
  }

  return null
}

/** Soft-delete: sets `is_active` to false. */
export async function deleteService(serviceId: string): Promise<{ error: string } | null> {
  return updateService(serviceId, { is_active: false })
}
