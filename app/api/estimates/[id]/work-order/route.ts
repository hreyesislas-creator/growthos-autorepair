import { getDashboardTenant } from '@/lib/tenant'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/estimates/[id]/work-order
 *
 * Check if an estimate already has an associated work order.
 * Returns the work order ID and number if one exists.
 *
 * Used by the estimate editor to determine whether to show
 * "Create Work Order" or "View Work Order" button.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await getDashboardTenant()
    if (!ctx) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const tenantId = ctx.tenant.id
    const estimateId = params.id

    // Query for an existing work order for this estimate
    const adminClient = await createAdminClient()
    const { data, error } = await adminClient
      .from('work_orders')
      .select('id, work_order_number')
      .eq('tenant_id', tenantId)
      .eq('estimate_id', estimateId)
      .limit(1)
      .single()

    if (error) {
      // No work order found (expected case)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ id: null, work_order_number: null })
      }
      console.error('[work-order API] query error:', error.message)
      return NextResponse.json({ id: null, work_order_number: null })
    }

    // Work order exists
    return NextResponse.json({
      id: data?.id ?? null,
      work_order_number: data?.work_order_number ?? null,
    })
  } catch (err) {
    console.error('[work-order API] error:', err)
    return NextResponse.json({ id: null, work_order_number: null })
  }
}
