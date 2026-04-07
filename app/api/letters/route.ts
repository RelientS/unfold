import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/middleware'
import { detectLetterIntent } from '@/lib/anthropic'

// GET /api/letters — list user's letters
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('letters')
    .select('*')
    .eq('user_id', user.id)
    .order('trigger_time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ letters: data })
}

// POST /api/letters — create a letter
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { content, topic, trigger_source, trigger_time } = body

  if (!content || !trigger_time) {
    return NextResponse.json({ error: 'content and trigger_time required' }, { status: 400 })
  }

  const { data: letter, error } = await supabase
    .from('letters')
    .insert({
      user_id: user.id,
      content,
      topic: topic || null,
      trigger_source: trigger_source || 'rabbit',
      trigger_time,
      status: 'sealed',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ letter }, { status: 201 })
}
