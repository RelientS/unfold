import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/middleware'

export const dynamic = 'force-dynamic'

// GET /api/agent/notifications — poll for pending gentle prompts from the agent
// RabbitCompanion polls this every 60s to check for proactive nudges
export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ notifications: [] })

  // Fetch unprocessed gentle prompts from the current user's chat context
  const { data } = await supabase
    .from('chat_messages')
    .select('id, content, created_at')
    .eq('role', 'assistant')
    .ilike('content', '[gentle_prompt]%')
    .order('created_at', { ascending: false })
    .limit(5)

  const notifications = (data || [])
    .map((m) => {
      const match = m.content.match(/\[gentle_prompt\]([\s\S]*?)\[\/gentle_prompt\]/)
      return match
        ? { id: m.id, prompt: match[1].trim(), createdAt: m.created_at }
        : null
    })
    .filter(Boolean)

  return NextResponse.json({ notifications })
}
