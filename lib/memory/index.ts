/**
 * Three-layer memory architecture (Mem0-style):
 * - Working memory: current session context (transient)
 * - Episodic memory: diary summaries, key events (Supabase → SQLite)
 * - Semantic memory: long-term patterns, user preferences (pgvector)
 */

export type MemoryLayer = 'working' | 'episodic' | 'semantic'

export interface MemoryEntry {
  id: string
  layer: MemoryLayer
  content: string
  importance: number // 0-10
  createdAt: string
  expiresAt?: string
  metadata: Record<string, unknown>
}

export interface SearchResult {
  entry: MemoryEntry
  score: number
}

export interface MemoryStore {
  // Working memory (in-memory, session-scoped)
  working: {
    get(key: string): string | undefined
    set(key: string, value: string): void
    delete(key: string): void
    clear(): void
    all(): Record<string, string>
  }

  // Episodic memory (SQLite)
  episodic: {
    add(entry: Omit<MemoryEntry, 'id' | 'layer' | 'createdAt'>): MemoryEntry
    get(id: string): MemoryEntry | null
    query(filter: { minImportance?: number; limit?: number }): MemoryEntry[]
    recent(limit: number): MemoryEntry[]
    decayImportance(id: string, factor: number): void
    delete(id: string): void
    count(): number
  }

  // Semantic memory (pgvector via Supabase)
  semantic: {
    add(content: string, metadata?: Record<string, unknown>): Promise<MemoryEntry>
    search(query: string, limit?: number): Promise<SearchResult[]>
    updateImportance(id: string, importance: number): Promise<void>
    delete(id: string): Promise<void>
  }

  // Sync from Supabase
  sync: {
    fromDiaryEntries(entries: DiaryEntryRecord[]): Promise<void>
    fullSync(): Promise<void>
  }

  // Cleanup
  cleanup: {
    pruneLowImportance(threshold: number): number
    pruneExpired(): number
  }
}

export interface DiaryEntryRecord {
  id: string
  user_id: string
  entry_date: string
  canvas_state: Record<string, unknown> | null
  mood: string | null
  weather: string | null
  created_at: string
}
