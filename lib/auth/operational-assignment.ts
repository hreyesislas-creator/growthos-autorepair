/**
 * Per-record technician assignment for inspections and work orders.
 * Complements module-level RBAC: admins and service advisors bypass assignment;
 * technicians may only mutate rows assigned to their tenant_users.id.
 */

import { cache } from 'react'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  isAdmin,
  normalizeAppRole,
  type AppRole,
} from './role-access'

export interface DashboardTenantUser {
  tenantUserId: string
  role:           AppRole
}

/** Active tenant_users row for the session (id + normalized role). */
export const getCurrentDashboardTenantUser = cache(async function getCurrentDashboardTenantUser(): Promise<DashboardTenantUser | null> {
  const sessionClient = await createClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tenant_users')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data?.id) return null

  return {
    tenantUserId: data.id as string,
    role:           normalizeAppRole(data.role as string),
  }
})

export function canAssignOperationalTechnician(role: AppRole): boolean {
  return isAdmin(role) || role === 'service_advisor'
}

/**
 * Whether the role may mutate inspection / work order content given assignment.
 * Unassigned records: technicians are not allowed to edit (visibility only).
 */
export function technicianMayMutateAssignedRecord(
  role: AppRole,
  recordTechnicianId: string | null,
  currentTenantUserId: string,
): boolean {
  if (isAdmin(role) || role === 'service_advisor') return true
  if (role !== 'technician') return false
  return recordTechnicianId != null && recordTechnicianId === currentTenantUserId
}

export async function denyUnlessMayMutateInspection(
  inspectionId: string,
  tenantId:     string,
): Promise<{ error: string } | null> {
  const du = await getCurrentDashboardTenantUser()
  if (!du) return { error: 'Not authorized' }

  const admin = createAdminClient()
  const { data: row, error } = await admin
    .from('inspections')
    .select('technician_id')
    .eq('tenant_id', tenantId)
    .eq('id', inspectionId)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!row) return { error: 'Inspection not found.' }

  if (!technicianMayMutateAssignedRecord(du.role, row.technician_id as string | null, du.tenantUserId)) {
    return { error: 'You can only edit inspections assigned to you.' }
  }
  return null
}

export async function denyUnlessMayMutateWorkOrder(
  workOrderId: string,
  tenantId:   string,
): Promise<{ error: string } | null> {
  const du = await getCurrentDashboardTenantUser()
  if (!du) return { error: 'Not authorized' }

  const admin = createAdminClient()
  const { data: row, error } = await admin
    .from('work_orders')
    .select('technician_id')
    .eq('tenant_id', tenantId)
    .eq('id', workOrderId)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!row) return { error: 'Work order not found.' }

  if (!technicianMayMutateAssignedRecord(du.role, row.technician_id as string | null, du.tenantUserId)) {
    return { error: 'You can only edit work orders assigned to you.' }
  }
  return null
}
