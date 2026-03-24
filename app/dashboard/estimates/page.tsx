import { notFound }         from 'next/navigation'
import { getDashboardTenant } from '@/lib/tenant'
import { createClient }       from '@/lib/supabase/server'
import Topbar                 from '@/components/dashboard/Topbar'
import EstimatesList          from './EstimatesList'

export const metadata = { title: 'Estimates' }

// ── Resolved row shape passed to the client component ────────────────────────
export type EstimateListRow = {
  id:              string
  estimate_number: string
  status:          string
  creation_mode:   string
  total:           number
  created_at:      string
  updated_at:      string
  customerName:    string | null
  vehicleLabel:    string | null
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function EstimatesPage() {
  const ctx = await getDashboardTenant()
  if (!ctx) return notFound()           // auth guard — same pattern as all other pages

  const tenantId = ctx.tenant.id
  const supabase = await createClient()

  // ── Step 1: Fetch estimates without embedded joins ────────────────────────
  //
  // IMPORTANT: do NOT use Supabase's embedded join syntax
  //   customer:customers(first_name, last_name)
  // That syntax requires PostgreSQL FK constraints to be registered in the
  // PostgREST schema cache.  If the FK is missing, the query returns an error
  // that is silently swallowed and the list shows "No estimates yet".
  //
  // Instead: fetch estimates, then bulk-resolve customers and vehicles in two
  // separate queries using .in('id', [...]) — works without any FK constraints.
  //
  const { data: rawRows, error } = await supabase
    .from('estimates')
    .select('id, estimate_number, status, creation_mode, total, created_at, updated_at, customer_id, vehicle_id')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[EstimatesPage] estimates query failed:', error.message)
  }

  const rows = rawRows ?? []

  // ── Step 2: Collect unique foreign-key IDs ────────────────────────────────
  const customerIds = [...new Set(
    rows.map(r => r.customer_id as string | null).filter((id): id is string => !!id),
  )]
  const vehicleIds = [...new Set(
    rows.map(r => r.vehicle_id  as string | null).filter((id): id is string => !!id),
  )]

  // ── Step 3: Bulk-fetch customers + vehicles in parallel ───────────────────
  const [customersRes, vehiclesRes] = await Promise.all([
    customerIds.length > 0
      ? supabase
          .from('customers')
          .select('id, first_name, last_name')
          .in('id', customerIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string }[], error: null }),
    vehicleIds.length > 0
      ? supabase
          .from('vehicles')
          .select('id, year, make, model')
          .in('id', vehicleIds)
      : Promise.resolve({ data: [] as { id: string; year: number | null; make: string | null; model: string | null }[], error: null }),
  ])

  if (customersRes.error) console.error('[EstimatesPage] customers query:', customersRes.error.message)
  if (vehiclesRes.error)  console.error('[EstimatesPage] vehicles query:',  vehiclesRes.error.message)

  // ── Step 4: Build lookup maps ─────────────────────────────────────────────
  const customerMap = new Map((customersRes.data ?? []).map(c => [c.id, c]))
  const vehicleMap  = new Map((vehiclesRes.data  ?? []).map(v => [v.id, v]))

  // ── Step 5: Combine into resolved rows ────────────────────────────────────
  const estimates: EstimateListRow[] = rows.map(r => {
    const cId = r.customer_id as string | null
    const vId = r.vehicle_id  as string | null
    const c   = cId ? customerMap.get(cId) : undefined
    const v   = vId ? vehicleMap.get(vId)  : undefined

    return {
      id:              r.id,
      estimate_number: r.estimate_number,
      status:          r.status,
      creation_mode:   r.creation_mode,
      total:           Number(r.total),
      created_at:      r.created_at,
      updated_at:      r.updated_at,
      customerName:    c ? `${c.first_name} ${c.last_name}`.trim() : null,
      vehicleLabel:    v ? [v.year, v.make, v.model].filter(Boolean).join(' ') : null,
    }
  })

  return (
    <>
      <Topbar title="Estimates" />
      <EstimatesList estimates={estimates} />
    </>
  )
}
