import { NextRequest, NextResponse } from 'next/server'
import { getDashboardTenant } from '@/lib/tenant'
import { searchVehiclesForTenant } from '@/lib/queries'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''

  const ctx = await getDashboardTenant()
  if (!ctx?.tenant?.id) {
    return NextResponse.json([])
  }

  const results = await searchVehiclesForTenant(ctx.tenant.id, q, 8)
  return NextResponse.json(results)
}
