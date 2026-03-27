import { notFound }            from 'next/navigation'
import { getDashboardTenant }  from '@/lib/tenant'
import { createClient }        from '@/lib/supabase/server'
import Topbar                  from '@/components/dashboard/Topbar'
import EstimatesList           from './EstimatesList'
import { deriveDisplayStatus } from '@/lib/estimateDisplayStatus'

export const metadata = { title: 'Estimates' }

// ── Resolved row shape passed to the client component ────────────────────────
export type EstimateListRow = {
  id:              string
  estimate_number: string
  status:          string          // raw DB value — used for filter dropdown
  displayStatus:   string          // derived from decisions — used for badge display
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
    .eq('is_archived', false)          // Phase A: hide archived records from list
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
  const estimateIds = rows.map(r => r.id)

  // ── Step 3: Bulk-fetch customers, vehicles, item counts, and decisions ────
  //
  // item counts: we fetch (id, estimate_id) from estimate_items and count per
  //   estimate_id in JS — Supabase/PostgREST has no GROUP BY, this is idiomatic.
  //
  // decisions: we only need (estimate_id, decision) to derive display status.
  //   We do NOT use getEstimateItemDecisions() here because that function is
  //   per-estimate; this is a bulk list query.
  //
  const [customersRes, vehiclesRes, itemsRes, decisionsRes] = await Promise.all([
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
    estimateIds.length > 0
      ? supabase
          .from('estimate_items')
          .select('id, estimate_id')
          .eq('tenant_id', tenantId)
          .in('estimate_id', estimateIds)
          .limit(1000)   // up to 200 estimates × ~5 items; prevents silent PostgREST truncation
      : Promise.resolve({ data: [] as { id: string; estimate_id: string }[], error: null }),
    estimateIds.length > 0
      ? supabase
          .from('estimate_item_decisions')
          .select('estimate_id, decision')
          .eq('tenant_id', tenantId)
          .in('estimate_id', estimateIds)
          .limit(1000)   // at most 1 decision row per item; same ceiling as items query
      : Promise.resolve({ data: [] as { estimate_id: string; decision: string }[], error: null }),
  ])

  if (customersRes.error)  console.error('[EstimatesPage] customers query:',  customersRes.error.message)
  if (vehiclesRes.error)   console.error('[EstimatesPage] vehicles query:',   vehiclesRes.error.message)

  // ── Reliability flags for the display-status subsidiary queries ──────────
  //
  // If either query failed, its data will be null/empty.  We must NOT silently
  // pass empty arrays into deriveDisplayStatus — that would produce incorrect
  // display statuses (e.g. every estimate showing "Presented" because item
  // counts are all 0).
  //
  // When unreliable, we pass totalItemCount=0 and decisions=[] to
  // deriveDisplayStatus, which falls through to the plain-dbStatus fallback
  // (step 2) rather than fabricating counts from missing data.
  if (itemsRes.error) {
    console.error(
      '[EstimatesPage] estimate_items query failed — item counts unreliable;' +
      ' display status will fall back to plain DB status.',
      itemsRes.error.message,
    )
  }
  if (decisionsRes.error) {
    console.error(
      '[EstimatesPage] estimate_item_decisions query failed — decision counts unreliable;' +
      ' display status will fall back to plain DB status.',
      decisionsRes.error.message,
    )
  }

  const itemCountsReliable = !itemsRes.error
  const decisionsReliable  = !decisionsRes.error

  // ── Step 4: Build lookup maps ─────────────────────────────────────────────
  const customerMap = new Map((customersRes.data ?? []).map(c => [c.id, c]))
  const vehicleMap  = new Map((vehiclesRes.data  ?? []).map(v => [v.id, v]))

  // itemCountMap: estimateId → number of estimate_items rows
  const itemCountMap = new Map<string, number>()
  for (const item of (itemsRes.data ?? [])) {
    itemCountMap.set(item.estimate_id, (itemCountMap.get(item.estimate_id) ?? 0) + 1)
  }

  // decisionsMap: estimateId → array of { decision } rows
  const decisionsMap = new Map<string, { decision: string }[]>()
  for (const d of (decisionsRes.data ?? [])) {
    if (!decisionsMap.has(d.estimate_id)) decisionsMap.set(d.estimate_id, [])
    decisionsMap.get(d.estimate_id)!.push({ decision: d.decision })
  }

  // ── Step 5: Combine into resolved rows ────────────────────────────────────
  const estimates: EstimateListRow[] = rows.map(r => {
    const cId = r.customer_id as string | null
    const vId = r.vehicle_id  as string | null
    const c   = cId ? customerMap.get(cId) : undefined
    const v   = vId ? vehicleMap.get(vId)  : undefined

    // Use 0 / [] when the subsidiary query failed so deriveDisplayStatus
    // hits its step-2 plain-dbStatus fallback rather than returning a status
    // derived from empty data.
    const totalItemCount = itemCountsReliable ? (itemCountMap.get(r.id) ?? 0) : 0
    const rowDecisions   = decisionsReliable  ? (decisionsMap.get(r.id) ?? []) : []

    return {
      id:              r.id,
      estimate_number: r.estimate_number,
      status:          r.status,
      displayStatus:   deriveDisplayStatus(r.status, totalItemCount, rowDecisions),
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
