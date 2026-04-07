// Supabase client-side utilities
import { createClient } from '@supabase/supabase-js'

function getUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

function getKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
}

// Lazy-initialized client to avoid build-time errors
let _client: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!_client) {
    const url = getUrl()
    const key = getKey()
    if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not configured')
    _client = createClient(url, key)
  }
  return _client
}

// Backwards-compatible named export
export const supabaseClient = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    return (getSupabaseClient() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// ── Sign in with magic link ───────────────────────────────────────────────────
export async function signInWithEmail(email: string) {
  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) throw error
}

// ── Sign in with Google ───────────────────────────────────────────────────────
export async function signInWithGoogle() {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) throw error
}

// ── Sign out ──────────────────────────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabaseClient.auth.signOut()
  if (error) throw error
}

// ── Get current session ───────────────────────────────────────────────────────
export async function getSession() {
  const { data: { session } } = await supabaseClient.auth.getSession()
  return session
}
