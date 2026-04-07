/**
 * SQLite-based episodic memory store using sql.js (WASM).
 * Works in both Node.js and browser environments without native dependencies.
 * Stores diary summaries, key events, and conversation highlights.
 */

import initSqlJs, { Database, SqlValue } from 'sql.js'
import { MemoryEntry, MemoryLayer } from './index'

let db: Database | null = null
let dbInitPromise: Promise<Database> | null = null

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

async function getDb(): Promise<Database> {
  if (db) return db
  if (dbInitPromise) return dbInitPromise

  dbInitPromise = (async () => {
    const SQL = await initSqlJs({
      locateFile: (file) => `https://sql.js.org/dist/${file}`,
    })
    const database = new SQL.Database()

    database.run(`
      CREATE TABLE IF NOT EXISTS episodic_memory (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        importance REAL NOT NULL DEFAULT 5.0,
        created_at TEXT NOT NULL,
        expires_at TEXT,
        metadata TEXT NOT NULL DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_episodic_importance ON episodic_memory(importance);
      CREATE INDEX IF NOT EXISTS idx_episodic_created ON episodic_memory(created_at);
    `)

    db = database
    return database
  })()

  return dbInitPromise
}

function rowToEntry(row: unknown[]): MemoryEntry {
  const [id, content, importance, created_at, expires_at, metadata] = row as [
    string, string, number, string, string | null, string
  ]
  return {
    id,
    layer: 'episodic' as MemoryLayer,
    content,
    importance,
    createdAt: created_at,
    expiresAt: expires_at || undefined,
    metadata: JSON.parse(metadata),
  }
}

export const episodicMemory = {
  async add(entry: Omit<MemoryEntry, 'id' | 'layer' | 'createdAt'>): Promise<MemoryEntry> {
    const database = await getDb()
    const id = generateId()
    const createdAt = new Date().toISOString()

    database.run(
      `INSERT INTO episodic_memory (id, content, importance, created_at, expires_at, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        entry.content,
        entry.importance,
        createdAt,
        entry.expiresAt || null,
        JSON.stringify(entry.metadata),
      ]
    )

    return {
      id,
      layer: 'episodic',
      content: entry.content,
      importance: entry.importance,
      createdAt,
      expiresAt: entry.expiresAt,
      metadata: entry.metadata,
    }
  },

  async get(id: string): Promise<MemoryEntry | null> {
    const database = await getDb()
    const result = database.exec(`SELECT id, content, importance, created_at, expires_at, metadata FROM episodic_memory WHERE id = ?`, [id])
    if (result.length === 0 || result[0].values.length === 0) return null
    return rowToEntry(result[0].values[0])
  },

  async query(filter: { minImportance?: number; limit?: number } = {}): Promise<MemoryEntry[]> {
    const database = await getDb()
    let sql = `SELECT id, content, importance, created_at, expires_at, metadata FROM episodic_memory WHERE 1=1`
    const params: SqlValue[] = []

    if (filter.minImportance !== undefined) {
      sql += ` AND importance >= ?`
      params.push(filter.minImportance)
    }

    sql += ` ORDER BY importance DESC, created_at DESC`

    if (filter.limit) {
      sql += ` LIMIT ?`
      params.push(filter.limit)
    }

    const result = database.exec(sql, params)
    if (result.length === 0) return []
    return result[0].values.map(rowToEntry)
  },

  async recent(limit: number = 20): Promise<MemoryEntry[]> {
    const database = await getDb()
    const result = database.exec(
      `SELECT id, content, importance, created_at, expires_at, metadata
       FROM episodic_memory ORDER BY created_at DESC LIMIT ?`,
      [limit]
    )
    if (result.length === 0) return []
    return result[0].values.map(rowToEntry)
  },

  async decayImportance(id: string, factor: number): Promise<void> {
    const database = await getDb()
    database.run(
      `UPDATE episodic_memory SET importance = MAX(0, importance * ?) WHERE id = ?`,
      [factor, id]
    )
  },

  async delete(id: string): Promise<void> {
    const database = await getDb()
    database.run(`DELETE FROM episodic_memory WHERE id = ?`, [id])
  },

  async count(): Promise<number> {
    const database = await getDb()
    const result = database.exec(`SELECT COUNT(*) FROM episodic_memory`)
    if (result.length === 0) return 0
    return result[0].values[0][0] as number
  },

  async pruneLowImportance(threshold: number): Promise<number> {
    const database = await getDb()
    const result = database.exec(
      `DELETE FROM episodic_memory WHERE importance < ?`,
      [threshold]
    )
    return database.getRowsModified()
  },

  async pruneExpired(): Promise<number> {
    const database = await getDb()
    const now = new Date().toISOString()
    database.run(`DELETE FROM episodic_memory WHERE expires_at IS NOT NULL AND expires_at < ?`, [now])
    return database.getRowsModified()
  },
}
