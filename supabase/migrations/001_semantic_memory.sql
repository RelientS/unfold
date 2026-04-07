-- Migration: Add semantic_memory table and pgvector support
-- Run this in Supabase SQL Editor

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create semantic_memory table
CREATE TABLE IF NOT EXISTS semantic_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(384),  -- Xenova/all-MiniLM-L6-v2 produces 384-dim embeddings
  importance TEXT DEFAULT '5.0',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_semantic_memory_embedding
  ON semantic_memory USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_semantic_memory_user_id
  ON semantic_memory(user_id);

-- RPC function for semantic search (match_semantic_memory)
CREATE OR REPLACE FUNCTION match_semantic_memory(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  importance text,
  created_at timestamptz,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sm.id,
    sm.content,
    sm.importance,
    sm.created_at,
    sm.metadata
  FROM semantic_memory sm
  WHERE 1 - (sm.embedding <=> query_embedding) > match_threshold
  ORDER BY sm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Comment on table
COMMENT ON TABLE semantic_memory IS 'Long-term semantic memory with pgvector embeddings';
