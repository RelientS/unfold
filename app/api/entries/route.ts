import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/middleware'

// GET /api/entries?year=&month= — list entries for month
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year')
  const month = searchParams.get('month') // 1-12

  if (!year || !month) {
    return NextResponse.json({ error: 'year and month required' }, { status: 400 })
  }

  const startDate = `${year}-${month.padStart(2, '0')}-01`
  const endDate = `${year}-${month.padStart(2, '0')}-31`

  const { data, error } = await supabase
    .from('diary_entries')
    .select('id, entry_date, mood, weather, thumbnail_url, is_sealed, template_id')
    .eq('user_id', user.id)
    .gte('entry_date', startDate)
    .lte('entry_date', endDate)
    .order('entry_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data })
}

// POST /api/entries — create or update entry
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { entry_date, canvas_state, mood, weather, background_id, font_id, template_id } = body

  if (!entry_date) {
    return NextResponse.json({ error: 'entry_date required' }, { status: 400 })
  }

  // Upsert entry
  const { data, error } = await supabase
    .from('diary_entries')
    .upsert({
      user_id: user.id,
      entry_date,
      canvas_state,
      mood,
      weather,
      background_id: background_id || null,
      font_id: font_id || null,
      template_id: template_id || 'blank',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,entry_date',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Trigger async thumbnail generation via Edge Function in production
  // For now return the entry
  return NextResponse.json({ entry: data }, { status: 200 })
}
