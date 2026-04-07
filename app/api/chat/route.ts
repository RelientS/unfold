import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/middleware'
import { rabbitStreamChat, detectLetterIntent } from '@/lib/anthropic'
import { buildMemoryContext } from '@/lib/agent'

// POST /api/chat — SSE stream chat with rabbit
// Returns letter_intent signal if user's message contains future-self patterns
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { message, mood, weather, date, session_id, capsule_context } = body

  if (!message || !date) {
    return NextResponse.json({ error: 'message and date required' }, { status: 400 })
  }

  // Get or create session
  let sessionId = session_id
  if (!sessionId) {
    const { data: newSession } = await supabase
      .from('chat_sessions')
      .insert({ user_id: user.id })
      .select('id')
      .single()
    sessionId = newSession?.id
  }

  // Save user message
  if (sessionId) {
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message,
    })
  }

  // Detect letter intent before streaming (for SSR; frontend also detects on-click)
  const letterIntent = detectLetterIntent(message)

  // Build memory context for richer rabbit responses
  const memoryContext = await buildMemoryContext(user.id)

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    start(controller) {
      // Send letter_intent signal first if detected
      if (letterIntent.hasIntent) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'letter_intent', ...letterIntent })}\n\n`
        ))
      }

      // Stream response from Minimax
      rabbitStreamChat(
        {
          message,
          mood,
          weather,
          date,
          capsuleContext: capsule_context,
          memoryContext,
        },
        {
          onText(text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          },
          onDone() {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
            controller.close()
          },
          onError(err) {
            controller.error(err)
          },
        }
      )
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
