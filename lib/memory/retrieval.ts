/**
 * Semantic memory retrieval using Supabase pgvector.
 * Stores long-term patterns, user preferences, and learned facts.
 */

import { supabaseAdmin } from '@/lib/supabase/server'
import type { MemoryEntry, SearchResult, MemoryLayer } from './index'

const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2' // Lightweight embedding model

interface SemanticMemoryRow {
  id: string
  content: string
  importance: number
  created_at: string
  metadata: Record<string, unknown>
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`https://api-inference.huggingface.co/pipeline/feature-extraction/${EMBEDDING_MODEL}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.HUGGINGFACE_TOKEN || ''}` },
    body: JSON.stringify({ inputs: text }),
  })
  if (!response.ok) {
    // Fallback: return zero vector if embedding service unavailable
    return new Array(384).fill(0)
  }
  const embedding = await response.json()
  return embedding
}

export const semanticMemory = {
  /**
   * Add a semantic memory entry with embedding stored in pgvector
   */
  async add(content: string, metadata: Record<string, unknown> = {}): Promise<MemoryEntry> {
    const embedding = await generateEmbedding(content)

    const { data, error } = await supabaseAdmin
      .from('semantic_memory')
      .insert({
        content,
        embedding,
        importance: (metadata.importance as number) || 5.0,
        metadata,
      })
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      layer: 'semantic',
      content: data.content,
      importance: data.importance,
      createdAt: data.created_at,
      metadata: data.metadata || {},
    }
  },

  /**
   * Search semantic memory by similarity
   */
  async search(query: string, limit: number = 5): Promise<SearchResult[]> {
    const queryEmbedding = await generateEmbedding(query)

    const { data, error } = await supabaseAdmin
      .rpc('match_semantic_memory', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit,
      })
      .select('id, content, importance, created_at, metadata')

    if (error) {
      console.error('Semantic search error:', error)
      return []
    }

    return (data as SemanticMemoryRow[]).map((row) => ({
      entry: {
        id: row.id,
        layer: 'semantic' as MemoryLayer,
        content: row.content,
        importance: row.importance,
        createdAt: row.created_at,
        metadata: row.metadata || {},
      },
      score: 1, // pgvector doesn't return distance in this RPC
    }))
  },

  /**
   * Update importance score
   */
  async updateImportance(id: string, importance: number): Promise<void> {
    await supabaseAdmin
      .from('semantic_memory')
      .update({ importance })
      .eq('id', id)
  },

  /**
   * Delete a semantic memory entry
   */
  async delete(id: string): Promise<void> {
    await supabaseAdmin.from('semantic_memory').delete().eq('id', id)
  },
}
