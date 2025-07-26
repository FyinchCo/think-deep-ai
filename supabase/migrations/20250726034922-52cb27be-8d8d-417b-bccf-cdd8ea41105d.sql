-- Enable the pgvector extension for semantic similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Table to store embeddings for validated answers with domain scoping
CREATE TABLE answer_embeddings (
  answer_id UUID PRIMARY KEY REFERENCES answers(id) ON DELETE CASCADE,
  embedding VECTOR(1536) NOT NULL, -- OpenAI text-embedding-3-small dimensions
  domain TEXT NOT NULL DEFAULT 'philosophy',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on answer_embeddings
ALTER TABLE answer_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS policies for answer_embeddings
CREATE POLICY "Answer embeddings are publicly viewable" 
ON answer_embeddings 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create answer embeddings" 
ON answer_embeddings 
FOR INSERT 
WITH CHECK (true);

-- Efficient similarity search index using HNSW
CREATE INDEX answer_embeddings_hnsw_idx 
ON answer_embeddings 
USING HNSW (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- Domain-specific index for faster filtering
CREATE INDEX answer_embeddings_domain_idx 
ON answer_embeddings (domain);

-- Add domain column to rabbit_holes if not exists
ALTER TABLE rabbit_holes 
ADD COLUMN IF NOT EXISTS domain TEXT NOT NULL DEFAULT 'philosophy';

-- Update existing rabbit holes to have philosophy domain
UPDATE rabbit_holes SET domain = 'philosophy' WHERE domain IS NULL;

-- Add settings for vector store configuration
INSERT INTO settings (key, value, description) VALUES 
('vector_similarity_threshold', '0.95', 'Threshold for considering content too similar (0-1, higher = more strict)'),
('embedding_model', '"text-embedding-3-small"', 'OpenAI embedding model to use'),
('global_novelty_enabled', 'true', 'Whether to check global novelty against all domains')
ON CONFLICT (key) DO NOTHING;