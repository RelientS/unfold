import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/middleware'

export const dynamic = 'force-dynamic'

// GET /api/templates — list all templates
export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('category', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data })
}
