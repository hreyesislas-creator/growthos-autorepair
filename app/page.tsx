import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EETiresShopHomepage from '@/components/marketing/EETiresShopHomepage'

/** Hostnames that serve the public E&E shop homepage at `/`. All others use SaaS entry redirects. */
const SHOP_MARKETING_ROOT_HOSTS = new Set(['eetires.com', 'www.eetires.com'])

function normalizedHost(hostHeader: string | null): string {
  if (!hostHeader) return ''
  return hostHeader.split(':')[0].trim().toLowerCase()
}

export async function generateMetadata(): Promise<Metadata> {
  const host = normalizedHost((await headers()).get('host'))
  if (SHOP_MARKETING_ROOT_HOSTS.has(host)) {
    return {
      title: 'E&E Tires Automotive Center | Banning, CA | Tires & Auto Repair',
    }
  }
  return {
    title: 'GrowthOS AutoRepair',
    robots: { index: false, follow: false },
  }
}

export default async function RootPage() {
  const host = normalizedHost((await headers()).get('host'))

  if (SHOP_MARKETING_ROOT_HOSTS.has(host)) {
    return <EETiresShopHomepage />
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }
  redirect('/auth/login')
}
