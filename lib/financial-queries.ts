/**
 * Financial metrics for dashboard reporting.
 * Reads from invoice_payments + invoices only; aggregates in memory (V1).
 */

import { createAdminClient } from '@/lib/supabase/server'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  startOfMonth,
  subDays,
  subMonths,
  format,
  parseISO,
  isWithinInterval,
} from 'date-fns'

function hasValue(v: string | undefined | null): v is string {
  return typeof v === 'string' && v.length > 0
}

type PaymentRow = { amount: number | string; paid_at: string; payment_method: string }

/** ISO date key YYYY-MM-DD in UTC */
function utcDayKey(iso: string): string {
  const d = parseISO(iso)
  return format(d, 'yyyy-MM-dd')
}

function num(v: number | string | null | undefined): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export interface RevenueByDayRow {
  date: string
  amount: number
}

export interface RevenueByPeriodRow {
  label: string
  amount: number
}

export interface DashboardActivityItem {
  kind: 'payment' | 'invoice' | 'inspection' | 'message'
  at: string
  title: string
  detail: string
  href: string
}

export interface FinancialDashboardData {
  revenueTotal: number
  revenueToday: number
  revenueThisWeek: number
  revenueThisMonth: number
  revenueByDayLast7: RevenueByDayRow[]
  revenueByDayLast30: RevenueByDayRow[]
  revenueByWeek: RevenueByPeriodRow[]
  revenueByMonth: RevenueByPeriodRow[]
  revenueByPaymentMethod: { method: string; amount: number }[]
  outstandingBalance: number
  averageTicketPaid: number
  partsTotalLast30d: number
  laborTotalLast30d: number
  pendingEstimatesCount: number
  pendingEstimatesAmount: number
  carsInServiceCount: number
  readyForPickupCount: number
  recentActivity: DashboardActivityItem[]
}

const PAYMENT_FETCH_LIMIT = 15_000

const PENDING_ESTIMATE_STATUSES = ['draft', 'presented', 'reopened'] as const

export type GetFinancialDashboardDataOptions = {
  /**
   * When set, work order counts and inspection activity are limited to this tenant_users.id.
   * Pass `''` when the viewer is a technician without a membership id (yields no WO/inspection rows).
   */
  technicianIdEq?: string
}

/**
 * Single tenant-scoped load for the financial dashboard.
 */
export async function getFinancialDashboardData(
  tenantId: string,
  options?: GetFinancialDashboardDataOptions,
): Promise<FinancialDashboardData> {
  const empty: FinancialDashboardData = {
    revenueTotal: 0,
    revenueToday: 0,
    revenueThisWeek: 0,
    revenueThisMonth: 0,
    revenueByDayLast7: [],
    revenueByDayLast30: [],
    revenueByWeek: [],
    revenueByMonth: [],
    revenueByPaymentMethod: [],
    outstandingBalance: 0,
    averageTicketPaid: 0,
    partsTotalLast30d: 0,
    laborTotalLast30d: 0,
    pendingEstimatesCount: 0,
    pendingEstimatesAmount: 0,
    carsInServiceCount: 0,
    readyForPickupCount: 0,
    recentActivity: [],
  }

  if (!hasValue(tenantId)) return empty

  const technicianEq = options?.technicianIdEq
  const technicianScoped = technicianEq !== undefined
  const technicianHasId = technicianScoped && hasValue(technicianEq)

  const supabase = createAdminClient()
  const now = new Date()
  const dayStart = startOfDay(now)
  const dayEnd = endOfDay(now)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)
  const last30 = subDays(now, 30)
  const weekBucketsStart = subDays(weekStart, 7 * 7)
  const monthBucketsStart = subMonths(monthStart, 11)

  let woQuery = supabase.from('work_orders').select('id, status').eq('tenant_id', tenantId)
  if (technicianHasId) woQuery = woQuery.eq('technician_id', technicianEq)

  let inspRecentQuery = supabase
    .from('inspections')
    .select('id, status, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })
    .limit(8)
  if (technicianHasId) inspRecentQuery = inspRecentQuery.eq('technician_id', technicianEq)

  const [
    payRes,
    invBalanceRes,
    invPaidRes,
    estRes,
    woRes,
    invRecentRes,
    inspRecentRes,
    msgRes,
  ] = await Promise.all([
    supabase
      .from('invoice_payments')
      .select('amount, paid_at, payment_method')
      .eq('tenant_id', tenantId)
      .order('paid_at', { ascending: false })
      .limit(PAYMENT_FETCH_LIMIT),
    supabase.from('invoices').select('balance_due').eq('tenant_id', tenantId),
    supabase
      .from('invoices')
      .select('total, payment_status, subtotal_labor, subtotal_parts, updated_at')
      .eq('tenant_id', tenantId)
      .eq('payment_status', 'paid'),
    supabase
      .from('estimates')
      .select('id, status, total')
      .eq('tenant_id', tenantId)
      .in('status', [...PENDING_ESTIMATE_STATUSES]),
    technicianScoped && !technicianHasId
      ? Promise.resolve({ data: [] as { id: string; status: string }[], error: null })
      : woQuery,
    supabase
      .from('invoices')
      .select('id, invoice_number, total, payment_status, updated_at, created_at')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(8),
    technicianScoped && !technicianHasId
      ? Promise.resolve({ data: [] as { id: string; status: string; created_at: string; updated_at: string }[], error: null })
      : inspRecentQuery,
    supabase
      .from('message_logs')
      .select('id, created_at, message_body, to_phone, delivery_status, channel')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  if (payRes.error) {
    console.error('[getFinancialDashboardData] invoice_payments:', payRes.error.message)
  }
  const payments = (payRes.data ?? []) as PaymentRow[]

  // ── Revenue aggregates ─────────────────────────────────────────────────
  const byDay = new Map<string, number>()
  const byMethod = new Map<string, number>()
  let revenueTotal = 0

  for (const p of payments) {
    const a = num(p.amount)
    if (a <= 0) continue
    revenueTotal += a
    const key = utcDayKey(p.paid_at)
    byDay.set(key, (byDay.get(key) ?? 0) + a)
    const m = p.payment_method || 'other'
    byMethod.set(m, (byMethod.get(m) ?? 0) + a)
  }

  let revenueToday = 0
  let revenueThisWeek = 0
  let revenueThisMonth = 0
  for (const p of payments) {
    const a = num(p.amount)
    if (a <= 0) continue
    const t = parseISO(p.paid_at)
    if (isWithinInterval(t, { start: dayStart, end: dayEnd })) revenueToday += a
    if (t >= weekStart && t <= now) revenueThisWeek += a
    if (t >= monthStart && t <= now) revenueThisMonth += a
  }

  const fillDays = (numDays: number): RevenueByDayRow[] => {
    const rows: RevenueByDayRow[] = []
    for (let i = numDays - 1; i >= 0; i--) {
      const d = subDays(startOfDay(now), i)
      const key = format(d, 'yyyy-MM-dd')
      rows.push({ date: key, amount: byDay.get(key) ?? 0 })
    }
    return rows
  }

  const revenueByDayLast7 = fillDays(7)
  const revenueByDayLast30 = fillDays(30)

  // Last 8 weeks (label = week start Mon)
  const byWeek = new Map<string, number>()
  for (const p of payments) {
    const t = parseISO(p.paid_at)
    if (t < weekBucketsStart) continue
    const ws = startOfWeek(t, { weekStartsOn: 1 })
    const wk = format(ws, 'yyyy-MM-dd')
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + num(p.amount))
  }
  const revenueByWeek: RevenueByPeriodRow[] = []
  const thisMon = startOfWeek(now, { weekStartsOn: 1 })
  for (let i = 7; i >= 0; i--) {
    const ws = subDays(thisMon, i * 7)
    const key = format(ws, 'yyyy-MM-dd')
    revenueByWeek.push({
      label: format(ws, 'MMM d'),
      amount: byWeek.get(key) ?? 0,
    })
  }

  // Last 12 months
  const byMonth = new Map<string, number>()
  for (const p of payments) {
    const t = parseISO(p.paid_at)
    if (t < monthBucketsStart) continue
    const mk = format(t, 'yyyy-MM')
    byMonth.set(mk, (byMonth.get(mk) ?? 0) + num(p.amount))
  }
  const revenueByMonth: RevenueByPeriodRow[] = []
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(monthStart, i)
    const mk = format(d, 'yyyy-MM')
    revenueByMonth.push({
      label: format(d, 'MMM yyyy'),
      amount: byMonth.get(mk) ?? 0,
    })
  }

  const revenueByPaymentMethod = [...byMethod.entries()]
    .map(([method, amount]) => ({ method, amount }))
    .sort((a, b) => b.amount - a.amount)

  // ── Outstanding & ticket ────────────────────────────────────────────────
  let outstandingBalance = 0
  if (!invBalanceRes.error && invBalanceRes.data) {
    for (const row of invBalanceRes.data) {
      outstandingBalance += num((row as { balance_due?: number }).balance_due)
    }
  } else if (invBalanceRes.error) {
    console.error('[getFinancialDashboardData] invoices balance:', invBalanceRes.error.message)
  }

  const paidInvoices = (invPaidRes.data ?? []) as {
    total: number
    subtotal_labor: number
    subtotal_parts: number
    updated_at: string
  }[]
  let averageTicketPaid = 0
  if (paidInvoices.length > 0) {
    const sumT = paidInvoices.reduce((s, r) => s + num(r.total), 0)
    averageTicketPaid = Math.round((sumT / paidInvoices.length) * 100) / 100
  }

  let partsTotalLast30d = 0
  let laborTotalLast30d = 0
  for (const r of paidInvoices) {
    const u = parseISO(r.updated_at)
    if (u < last30) continue
    partsTotalLast30d += num(r.subtotal_parts)
    laborTotalLast30d += num(r.subtotal_labor)
  }

  // ── Operational counts ───────────────────────────────────────────────────
  const estimates = (estRes.data ?? []) as { total: number }[]
  const pendingEstimatesCount = estimates.length
  const pendingEstimatesAmount = estimates.reduce((s, e) => s + num(e.total), 0)

  const wos = (woRes.data ?? []) as { status: string }[]
  const carsInServiceCount = wos.filter(w =>
    w.status === 'in_progress' || w.status === 'ready',
  ).length
  const readyForPickupCount = wos.filter(w => w.status === 'completed').length

  // ── Activity (merge) ─────────────────────────────────────────────────────
  const activity: DashboardActivityItem[] = []

  for (const p of payments.slice(0, 6)) {
    activity.push({
      kind: 'payment',
      at: p.paid_at,
      title: `Payment (${p.payment_method})`,
      detail: `$${num(p.amount).toFixed(2)}`,
      href: '/dashboard/invoices',
    })
  }

  if (!invRecentRes.error && invRecentRes.data) {
    for (const r of invRecentRes.data as { id: string; invoice_number: string | null; total: number; payment_status: string; updated_at: string }[]) {
      activity.push({
        kind: 'invoice',
        at: r.updated_at,
        title: `Invoice ${r.invoice_number ?? r.id.slice(0, 8)}`,
        detail: `$${num(r.total).toFixed(2)} · ${r.payment_status}`,
        href: `/dashboard/invoices/${r.id}`,
      })
    }
  }

  if (!inspRecentRes.error && inspRecentRes.data) {
    for (const r of inspRecentRes.data as { id: string; status: string; updated_at: string }[]) {
      activity.push({
        kind: 'inspection',
        at: r.updated_at,
        title: 'Inspection',
        detail: r.status,
        href: `/dashboard/inspections/${r.id}`,
      })
    }
  }

  if (!msgRes.error && msgRes.data) {
    for (const r of msgRes.data as {
      id: string
      created_at: string
      message_body: string
      to_phone: string
      delivery_status: string
    }[]) {
      const prev = (r.message_body ?? '').slice(0, 60)
      activity.push({
        kind: 'message',
        at: r.created_at,
        title: `Message to ${r.to_phone ?? '—'}`,
        detail: `${r.delivery_status ?? ''} · ${prev}${(r.message_body ?? '').length > 60 ? '…' : ''}`,
        href: '/dashboard/communications',
      })
    }
  }

  activity.sort((a, b) => parseISO(b.at).getTime() - parseISO(a.at).getTime())
  const recentActivity = activity.slice(0, 12)

  return {
    revenueTotal,
    revenueToday,
    revenueThisWeek,
    revenueThisMonth,
    revenueByDayLast7,
    revenueByDayLast30,
    revenueByWeek,
    revenueByMonth,
    revenueByPaymentMethod,
    outstandingBalance: Math.round(outstandingBalance * 100) / 100,
    averageTicketPaid,
    partsTotalLast30d: Math.round(partsTotalLast30d * 100) / 100,
    laborTotalLast30d: Math.round(laborTotalLast30d * 100) / 100,
    pendingEstimatesCount,
    pendingEstimatesAmount: Math.round(pendingEstimatesAmount * 100) / 100,
    carsInServiceCount,
    readyForPickupCount,
    recentActivity,
  }
}
