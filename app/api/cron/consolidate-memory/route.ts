import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { episodicMemory } from '@/lib/memory/sqlite'
import { semanticMemory } from '@/lib/memory/retrieval'

// Vercel Cron: runs daily — prune low-importance memories and consolidate patterns
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = supabaseAdmin

  // Get all users with recent activity
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(100)

  let totalPruned = 0
  let totalConsolidated = 0

  for (const user of users || []) {
    try {
      // Prune expired memories
      const expired = await episodicMemory.pruneExpired()
      totalPruned += expired

      // Prune very low importance memories
      const low = await episodicMemory.pruneLowImportance(1.5)
      totalPruned += low

      // Consolidate if we have enough episodic memories
      const count = await episodicMemory.count()
      if (count >= 10) {
        const recent = await episodicMemory.recent(20)
        if (recent.length >= 5) {
          const pattern = recent
            .map((m) => m.content)
            .join('\n---\n')

          // Extract a simple pattern summary
          const moodMatches = recent
            .map((m) => m.metadata?.mood)
            .filter(Boolean)
          const summary = `日记回顾：共 ${recent.length} 篇记录，主要情绪 ${
            moodMatches.length > 0 ? moodMatches[0] : '未标注'
          }`

          await semanticMemory.add(summary, {
            type: 'consolidated_pattern',
            importance: 6.0,
            memoryCount: recent.length,
          })

          // Decay importance of consolidated episodic memories
          for (const m of recent) {
            await episodicMemory.decayImportance(m.id, 0.8)
          }

          totalConsolidated++
        }
      }
    } catch (err) {
      console.error(`Memory consolidation failed for user ${user.id}:`, err)
    }
  }

  return NextResponse.json({
    pruned: totalPruned,
    consolidated: totalConsolidated,
    usersProcessed: users?.length || 0,
  })
}
