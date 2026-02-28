-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Thoughts table
CREATE TABLE IF NOT EXISTS thoughts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   text NOT NULL,
  raw_text     text NOT NULL,
  cleaned_text text NOT NULL,
  category     text NOT NULL CHECK (category IN ('Task', 'Idea', 'Reference')),
  intent       text NOT NULL,
  hierarchy    jsonb NOT NULL,
  embedding    vector(1536),
  created_at   timestamptz DEFAULT now()
);

-- Index for fast session lookups
CREATE INDEX IF NOT EXISTS thoughts_session_id_idx ON thoughts(session_id);

-- Index for chronological ordering
CREATE INDEX IF NOT EXISTS thoughts_created_at_idx ON thoughts(created_at DESC);
