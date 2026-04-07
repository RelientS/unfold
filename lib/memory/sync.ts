/**
 * Sync diary entries from Supabase → episodic memory (SQLite).
 * Runs on startup and periodically to keep local memory fresh.
 */

import { supabase } from '@/lib/supabase/server'
import { episodicMemory } from './sqlite'
import type { DiaryEntryRecord } from './index'

/**
 * Sync a batch of diary entries into episodic memory.
 * Creates a summary for each entry and stores it.
 */
export async function syncDiaryEntries(entries: DiaryEntryRecord[]): Promise<number> {
  let synced = 0

  for (const entry of entries) {
    // Skip if already has mood summary (dedup)
    const existing = await episodicMemory.query({
      minImportance: 0,
      limit: 100,
    })
    const alreadySynced = existing.some(
      (e) => e.metadata?.entryId === entry.id
    )
    if (alreadySynced) continue

    // Extract canvas text content for summary
    const canvasText = extractTextFromCanvas(entry.canvas_state)
    const summaryContent = buildSummary(entry, canvasText)

    await episodicMemory.add({
      content: summaryContent,
      importance: 5.0,
      expiresAt: undefined,
      metadata: {
        entryId: entry.id,
        entryDate: entry.entry_date,
        mood: entry.mood,
        weather: entry.weather,
        type: 'diary_summary',
      },
    })

    synced++
  }

  return synced
}

/**
 * Full sync: pull recent diary entries from Supabase and sync to local SQLite.
 */
export async function fullSync(userId: string): Promise<{ synced: number; total: number }> {
  // Fetch last 30 days of entries
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: entries, error } = await supabase
    .from('diary_entries')
    .select('id, user_id, entry_date, canvas_state, mood, weather, created_at')
    .eq('user_id', userId)
    .gte('entry_date', thirtyDaysAgo.toISOString().slice(0, 10))
    .order('entry_date', { ascending: false })

  if (error || !entries) {
    console.error('Full sync error:', error)
    return { synced: 0, total: 0 }
  }

  const synced = await syncDiaryEntries(entries as DiaryEntryRecord[])
  return { synced, total: entries.length }
}

function extractTextFromCanvas(canvasState: Record<string, unknown> | null): string {
  if (!canvasState || !canvasState.objects) return ''
  const objects = canvasState.objects as Array<{
    type?: string
    text?: string
    textArray?: string[]
  }>

  const texts: string[] = []
  for (const obj of objects) {
    if (obj.type === 'i-text' || obj.type === 'text') {
      if (Array.isArray(obj.textArray)) {
        texts.push(obj.textArray.join(''))
      } else if (obj.text) {
        texts.push(obj.text)
      }
    }
  }
  return texts.join('\n')
}

function buildSummary(
  entry: DiaryEntryRecord,
  canvasText: string
): string {
  const date = new Date(entry.entry_date + 'T12:00:00').toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const moodEmoji = entry.mood ? { serene: '平静', joyful: '喜悦', heavy: '沉重', anxious: '焦虑', tender: '温柔' }[entry.mood] || entry.mood : '未标注'
  const weatherEmoji = entry.weather ? { sunny: '☀️', cloudy: '☁️', rainy: '🌧️', snowy: '❄️' }[entry.weather] || entry.weather : ''

  const textPreview = canvasText.slice(0, 200).replace(/\n/g, ' ')

  return `${date} · ${moodEmoji}${weatherEmoji ? ' · ' + weatherEmoji : ''}。${textPreview ? '记录：' + textPreview + (canvasText.length > 200 ? '…' : '') : '空白日记'}`
}
