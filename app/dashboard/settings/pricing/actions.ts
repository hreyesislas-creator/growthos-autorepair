'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getDashboardTenant } from '@/lib/tenant'
import type { TenantPricingConfig } from '@/lib/types'

export interface SavePricingConfigInput {
  /** Entered by the user as a percentage string, e.g. "8.75". Stored as fraction 0.0875. */
  default_tax_rate_pct: string
  /** Default labor rate in $/hr, e.g. "125.00". Stored as-is. */
  default_labor_rate_str: string
  /** Parts markup as a percentage string, e.g. "30". Stored as 30.00. */
  parts_markup_pct_str: string
}

/**
 * Upserts the tenant's pricing configuration (tax rate, labor rate, parts markup).
 * Uses onConflict: tenant_id so it works whether or not a row already exists.
 */
export async function savePricingConfig(
  input: SavePricingConfigInput,
): Promise<{ data: TenantPricingConfig } | { error: string }> {
  const ctx = await getDashboardTenant()
  if (!ctx) return { error: 'Not authorized' }

  const supabase   = await createAdminClient()
  const tenantId   = ctx.tenant.id

  // ── Parse and validate tax rate ──────────────────────────────────────────
  const rawTax = input.default_tax_rate_pct.trim()
  let defaultTaxRate: number | null = null
  if (rawTax !== '') {
    const pct = parseFloat(rawTax)
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return { error: 'Tax rate must be a number between 0 and 100.' }
    }
    // Store as fraction (e.g. 8.75 → 0.087500)
    defaultTaxRate = Math.round((pct / 100) * 1_000_000) / 1_000_000
  }

  // ── Parse and validate labor rate ────────────────────────────────────────
  const rawLabor = input.default_labor_rate_str.trim()
  let defaultLaborRate: number | null = null
  if (rawLabor !== '') {
    const rate = parseFloat(rawLabor)
    if (isNaN(rate) || rate < 0) {
      return { error: 'Labor rate must be a positive number.' }
    }
    defaultLaborRate = Math.round(rate * 100) / 100
  }

  // ── Parse and validate parts markup % ────────────────────────────────────
  const rawMarkup = input.parts_markup_pct_str.trim()
  let partsMarkupPercent: number | null = null
  if (rawMarkup !== '') {
    const pct = parseFloat(rawMarkup)
    if (isNaN(pct) || pct < 0 || pct > 10_000) {
      return { error: 'Parts markup must be a number between 0 and 10000.' }
    }
    partsMarkupPercent = Math.round(pct * 10_000) / 10_000
  }

  const { data, error } = await supabase
    .from('tenant_pricing_configs')
    .upsert(
      {
        tenant_id:            tenantId,
        default_tax_rate:     defaultTaxRate,
        default_labor_rate:   defaultLaborRate,
        parts_markup_percent: partsMarkupPercent ?? 0,
        updated_at:           new Date().toISOString(),
      },
      { onConflict: 'tenant_id' },
    )
    .select()
    .single()

  if (error) {
    console.error('[savePricingConfig]', error.message)
    return { error: error.message }
  }

  return { data: data as TenantPricingConfig }
}
