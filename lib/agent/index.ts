/**
 * Bunny Agent — main loop and state machine.
 * Orchestrates memory, tools, and proactive behaviors.
 */

import { toolReflectOnDiary, toolConsolidateMemory, toolGentlePrompt } from './tools'
import { episodicMemory } from '@/lib/memory/sqlite'
import { semanticMemory } from '@/lib/memory/retrieval'
import { fullSync } from '@/lib/memory/sync'

// ── State ───────────────────────────────────────────────────────────────────

export type AgentState =
  | 'idle'
  | 'observing'      // watching user activity
  | 'reflecting'     // generating diary insights
  | 'consolidating'  // cleaning up memories
  | 'gentle_nudge'   // proactive gentle prompt

interface AgentContext {
  userId: string
  state: AgentState
  lastActivity: Date
  syncCount: number
}

const agentContexts = new Map<string, AgentContext>()

function getOrCreateContext(userId: string): AgentContext {
  if (!agentContexts.has(userId)) {
    agentContexts.set(userId, {
      userId,
      state: 'idle',
      lastActivity: new Date(),
      syncCount: 0,
    })
  }
  return agentContexts.get(userId)!
}

// ── Agent Actions ───────────────────────────────────────────────────────────

/**
 * Initialize agent for a user: sync memories from Supabase.
 */
export async function agentInit(userId: string): Promise<void> {
  const ctx = getOrCreateContext(userId)
  ctx.state = 'observing'

  try {
    const { synced } = await fullSync(userId)
    console.log(`[BunnyAgent] Synced ${synced} diary entries for user ${userId}`)
    ctx.syncCount++
  } catch (err) {
    console.error('[BunnyAgent] Init sync failed:', err)
  }
}

/**
 * Called when user sends a message — updates activity and may trigger reflection.
 */
export async function agentOnUserMessage(userId: string): Promise<void> {
  const ctx = getOrCreateContext(userId)
  ctx.lastActivity = new Date()

  // Every 7 messages, trigger a gentle reflection
  if (ctx.syncCount > 0 && ctx.syncCount % 7 === 0) {
    await agentTriggerReflection(userId)
  }
}

/**
 * Trigger diary reflection and store as semantic memory.
 */
export async function agentTriggerReflection(userId: string): Promise<string | null> {
  const ctx = getOrCreateContext(userId)
  if (ctx.state === 'reflecting') return null

  ctx.state = 'reflecting'
  try {
    const insight = await toolReflectOnDiary(userId)
    ctx.state = 'observing'
    return insight
  } catch (err) {
    console.error('[BunnyAgent] Reflection failed:', err)
    ctx.state = 'observing'
    return null
  }
}

/**
 * Periodic consolidation: prune low-importance memories and extract patterns.
 * Called by cron job.
 */
export async function agentConsolidate(userId: string): Promise<{ consolidated: number; pattern: string }> {
  const ctx = getOrCreateContext(userId)
  ctx.state = 'consolidating'

  try {
    const result = await toolConsolidateMemory(userId)
    ctx.state = 'observing'
    return result
  } catch (err) {
    console.error('[BunnyAgent] Consolidation failed:', err)
    ctx.state = 'observing'
    return { consolidated: 0, pattern: '' }
  }
}

/**
 * Build memory context string for injecting into system prompts.
 */
export async function buildMemoryContext(userId: string, limit: number = 5): Promise<string> {
  // Recent episodic
  const recent = await episodicMemory.recent(limit)

  // Semantic search for related patterns
  const semantic = await semanticMemory.search('diary mood feeling today', limit)

  const parts: string[] = []

  if (recent.length > 0) {
    parts.push('【最近记录】')
    for (const m of recent.slice(0, 3)) {
      parts.push(`• ${m.content}`)
    }
  }

  if (semantic.length > 0) {
    parts.push('【观察到的模式】')
    for (const s of semantic.slice(0, 2)) {
      parts.push(`• ${s.entry.content}`)
    }
  }

  return parts.join('\n')
}

/**
 * Get current agent state for debugging/monitoring.
 */
export function getAgentState(userId: string): AgentState | null {
  return agentContexts.get(userId)?.state || null
}
