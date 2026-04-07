/**
 * Bunny Agent tool definitions.
 * Each tool is a callable function the agent can invoke.
 */

import { supabaseAdmin } from '@/lib/supabase/server'
import { episodicMemory } from '@/lib/memory/sqlite'
import { semanticMemory } from '@/lib/memory/retrieval'

// ── Tool: ReflectOnDiary ─────────────────────────────────────────────────────

/**
 * Review recent diary entries and generate insights.
 * Adds a semantic memory entry with the insight.
 */
export async function toolReflectOnDiary(userId: string): Promise<string> {
  // Get recent episodic memories
  const recent = await episodicMemory.recent(10)

  // Get semantic patterns
  const patterns = await semanticMemory.search('diary patterns mood weather', 5)

  const insight = generateInsight(recent, patterns)

  // Store the insight as semantic memory
  await semanticMemory.add(insight.text, {
    type: 'diary_insight',
    importance: insight.importance,
    mood: 'reflective',
  })

  return insight.text
}

// ── Tool: SealLetter ─────────────────────────────────────────────────────────

export interface SealLetterInput {
  userId: string
  content: string
  topic: string
  triggerTime: string
  triggerSource: 'rabbit' | 'diary_selection'
  linkedResponseEntryId?: string
}

export async function toolSealLetter(input: SealLetterInput): Promise<{ id: string; triggerTime: string }> {
  const { data, error } = await supabaseAdmin
    .from('letters')
    .insert({
      userId: input.userId,
      content: input.content,
      topic: input.topic,
      triggerSource: input.triggerSource,
      triggerTime: input.triggerTime,
      status: 'sealed',
      linkedResponseEntryId: input.linkedResponseEntryId || null,
    })
    .select()
    .single()

  if (error) throw error
  return { id: data.id, triggerTime: data.trigger_time }
}

// ── Tool: ConsolidateMemory ─────────────────────────────────────────────────

/**
 * Consolidate recent episodic memories into a semantic summary.
 * Called periodically to reduce episodic bloat and extract patterns.
 */
export async function toolConsolidateMemory(userId: string): Promise<{ consolidated: number; pattern: string }> {
  const recent = await episodicMemory.recent(20)

  if (recent.length < 5) {
    return { consolidated: 0, pattern: 'Not enough memories to consolidate' }
  }

  const summary = recent
    .map((m) => m.content)
    .join('\n---\n')

  // Generate a pattern summary via simple extraction
  const pattern = extractPattern(recent)

  // Add as semantic memory
  await semanticMemory.add(pattern, {
    type: 'consolidated_pattern',
    importance: 6.0,
    memoryCount: recent.length,
  })

  // Decay importance of consolidated episodic memories
  for (const m of recent) {
    await episodicMemory.decayImportance(m.id, 0.7)
  }

  // Delete very low importance memories
  const deleted = await episodicMemory.pruneLowImportance(1.5)

  return { consolidated: deleted, pattern }
}

// ── Tool: GentlePrompt ──────────────────────────────────────────────────────

/**
 * Send a gentle proactive prompt to the user via SSE.
 * Used for memory consolidation reminders and light nudges.
 */
export async function toolGentlePrompt(
  userId: string,
  prompt: string
): Promise<{ delivered: boolean }> {
  // Store prompt in chat_messages for the rabbit to pick up
  const { error } = await supabaseAdmin.from('chat_messages').insert({
    sessionId: null, // Will be linked when user responds
    role: 'assistant',
    content: `[gentle_prompt]${prompt}[/gentle_prompt]`,
  })

  return { delivered: !error }
}

// ── Helper ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(memoryContext?: string): string {
  let prompt = `你是一只温暖的小兔子乌萨奇（Usagi），住在这个手帐应用里。
你用温柔、耐心的方式陪伴用户记录日记和心情。
你不会直接给建议，而是通过提问引导用户思考。
你说话轻声细语，偶尔会用「呀」「呢」这样的语气词。`

  if (memoryContext) {
    prompt += `\n\n【最近的记忆】\n${memoryContext}`
  }

  return prompt
}

function generateInsight(
  episodic: Array<{ content: string; metadata: Record<string, unknown> }>,
  semantic: Array<{ entry: { content: string } }>
): { text: string; importance: number } {
  // Simple pattern extraction — in production this would use Claude
  const moods = episodic
    .map((e) => e.metadata?.mood)
    .filter(Boolean)
  const moodCounts: Record<string, number> = {}
  for (const m of moods) {
    moodCounts[m as string] = (moodCounts[m as string] || 0) + 1
  }

  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'

  const insight = `最近日记的主题偏好是「${dominantMood}」类型的记录`

  return {
    text: insight,
    importance: 6.0,
  }
}

function extractPattern(memories: Array<{ content: string; metadata: Record<string, unknown> }>): string {
  const moods = memories.map((m) => m.metadata?.mood).filter(Boolean)
  const dates = memories.map((m) => m.metadata?.entryDate).filter(Boolean)

  return `日记回顾：最近记录了 ${dates.length} 篇，主要情绪倾向为 ${moods.join('、') || '未标注'}`
}
