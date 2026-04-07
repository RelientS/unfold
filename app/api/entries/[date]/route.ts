import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/middleware'

// GET /api/entries/[date] — get full entry
export async function GET(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('user_id', user.id)
    .eq('entry_date', params.date)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ entry: null })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entry: data })
}
