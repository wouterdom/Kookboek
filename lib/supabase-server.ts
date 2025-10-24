import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// For Tailscale HTTPS with self-signed certificates
if (process.env.NODE_ENV === 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      // Allow self-signed certificates in production
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          // @ts-ignore
          agent: process.env.NODE_ENV === 'production' ?
            new (require('https').Agent)({ rejectUnauthorized: false }) :
            undefined
        })
      }
    }
  }
)