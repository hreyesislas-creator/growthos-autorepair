import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard', '/admin']
const AUTH_PAGES = ['/auth/login']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // @supabase/ssr v0.3.x uses get / set / remove — NOT getAll / setAll
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Reflect the updated cookie on both the incoming request and the outgoing response
          request.cookies.set({ name, value, ...options })
          supabaseResponse = NextResponse.next({ request })
          supabaseResponse.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          supabaseResponse = NextResponse.next({ request })
          supabaseResponse.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  console.log('[middleware] pathname:', pathname, '| user:', user?.id ?? 'null')

  // Unauthenticated → redirect away from protected routes
  if (!user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    console.log('[middleware] BLOCKING unauthenticated request to', pathname, '→ /auth/login')
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Authenticated → bounce off the login page to prevent redirect loops
  if (user && AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    console.log('[middleware] REDIRECTING authenticated user away from', pathname, '→ /dashboard')
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.searchParams.delete('redirect')
    return NextResponse.redirect(url)
  }

  console.log('[middleware] PASSING THROUGH:', pathname)
  return supabaseResponse
}
