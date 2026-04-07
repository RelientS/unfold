import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/middleware'

// POST /api/letters/[id]/open — open a letter
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: letter, error: fetchError } = await supabase
    .from('letters')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !letter) {
    return NextResponse.json({ error: 'Letter not found' }, { status: 404 })
  }

  const { data: updated, error } = await supabase
    .from('letters')
    .update({
      status: 'opened',
      opened_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ letter: updated })
}
