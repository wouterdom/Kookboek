import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

export async function createClient() {
  const cookieStore = await cookies()

  // Custom fetch for Tailscale HTTPS with self-signed certificates
  const customFetch = (url: RequestInfo | URL, options: RequestInit = {}) => {
    // Only apply custom agent for HTTPS requests in production
    if (process.env.NODE_ENV === 'production' && typeof url === 'string' && url.startsWith('https://')) {
      const https = require('https')
      return fetch(url, {
        ...options,
        // @ts-ignore
        agent: new https.Agent({ rejectUnauthorized: false })
      })
    }
    return fetch(url, options)
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      global: {
        fetch: customFetch
      }
    }
  )
}