-- Fix function search path security issue by updating functions in place
-- instead of dropping them (to avoid cascade issues)

-- Fix existing functions by replacing them with secure versions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_last_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.last_updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION find_similar_answers(query_embedding text, similarity_threshold double precision DEFAULT 0.95, match_count integer DEFAULT 5, filter_domain text DEFAULT NULL::text)
RETURNS TABLE(answer_id uuid, similarity_score double precision, answer_text text, domain text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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