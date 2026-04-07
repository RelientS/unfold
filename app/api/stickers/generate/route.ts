import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/middleware'
import { generateSticker } from '@/lib/replicate'

// POST /api/stickers/generate — AI generate a sticker
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { keyword } = body

  if (!keyword || keyword.trim().length === 0) {
    return NextResponse.json({ error: 'keyword required' }, { status: 400 })
  }

  try {
    // Generate image via Replicate
    const imageUrl = await generateSticker(keyword.trim())

    // Save sticker record
    const { data: sticker, error } = await supabase
      .from('stickers')
      .insert({
        user_id: user.id,
        source: 'ai_generated',
        keyword: keyword.trim(),
        image_url: imageUrl,
        category: 'deco',
        style_tag: 'cute',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ sticker }, { status: 201 })
  } catch (err) {
    console.error('Sticker generation failed:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}

// GET /api/stickers/generate — list preset stickers
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('stickers')
    .select('*')
    .is('user_id', null) // preset stickers have no user_id
    .order('category', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stickers: data })
}
