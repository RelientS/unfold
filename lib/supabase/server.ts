import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy-initialized clients using getters to avoid build-time errors
let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

function getUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

function getAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
}

function getServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

// Public anon client (respects RLS) — proxied for lazy initialization
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      const url = getUrl()
      const key = getAnonKey()
      if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not configured')
      _supabase = createClient(url, key)
    }
    return (_supabase as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// Service role client (bypasses RLS) — proxied for lazy initialization
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabaseAdmin) {
      const url = getUrl()
      const key = getServiceKey()
      if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')
      _supabaseAdmin = createClient(url, key, {
        auth: { persistSession: false },
      })
    }
    return (_supabaseAdmin as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export function getSupabaseWithToken(token: string) {
  return createClient(getUrl(), getAnonKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })
}
