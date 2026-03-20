import { createBrowserClient } from '@supabase/ssr'

// @supabase/ssr v0.3.x DEFAULT_COOKIE_OPTIONS already sets:
//   path: "/", sameSite: "lax", httpOnly: false — no Secure flag.
// No custom cookies adapter needed; the library's internal document.cookie
// handling is correct for both localhost and production.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
