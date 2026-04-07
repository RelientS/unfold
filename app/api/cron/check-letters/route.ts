import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// pg_cron calls this every hour: update sealed letters to delivered
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = supabaseAdmin

  const { data, error } = await supabase
    .from('letters')
    .update({ status: 'delivered', delivered_at: new Date().toISOString() })
    .eq('status', 'sealed')
    .lte('trigger_time', new Date().toISOString())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updated: data || [] })
}
