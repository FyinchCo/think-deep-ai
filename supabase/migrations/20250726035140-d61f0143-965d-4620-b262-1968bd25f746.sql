-- Create function to find similar answers using vector similarity
CREATE OR REPLACE FUNCTION find_similar_answers(
  query_embedding TEXT,
  similarity_threshold FLOAT DEFAULT 0.95,
  match_count INT DEFAULT 5,
  filter_domain TEXT DEFAULT NULL
)
RETURNS TABLE (
  answer_id UUID,
  similarity_score FLOAT,
  answer_text TEXT,
  domain TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ae.answer_id,
    (1 - (ae.embedding::vector <=> query_embedding::vector)) AS similarity_score,
    a.answer_text,
    ae.domain
  FROM answer_embeddings ae
  JOIN answers a ON ae.answer_id = a.id
  WHERE (filter_domain IS NULL OR ae.domain = filter_domain)
    AND a.is_valid = true
    AND (1 - (ae.embedding::vector <=> query_embedding::vector)) >= similarity_threshold
  ORDER BY similarity_score DESC
  LIMIT match_count;
END;
$$;