import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/middleware'

export const dynamic = 'force-dynamic'

// GET /api/letters/due — delivered letters ready to be opened
export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('letters')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'delivered')
    .order('trigger_time', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ letters: data })
}
