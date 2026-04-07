import { createClient } from '@supabase/supabase-js'

export function createServerSupabaseClient(req?: Request) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        headers: req
          ? { cookie: req.headers.get('cookie') ?? '' }
          : {},
      },
    }
  )
}

export function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  // In a real implementation, you'd verify the JWT with Supabase
  // For now we rely on the middleware to set the user
  return token
}
