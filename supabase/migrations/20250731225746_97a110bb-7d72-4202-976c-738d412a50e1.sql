-- Fix function search path security issue by setting search_path
-- and then create mode effectiveness tracking functionality

-- First, fix the function by adding proper security settings
DROP FUNCTION IF EXISTS calculate_abstraction_level(TEXT);

CREATE OR REPLACE FUNCTION calculate_abstraction_level(text_content TEXT)
RETURNS FLOAT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    word_count INTEGER;
    abstract_words INTEGER;
    abstract_word_list TEXT[] := ARRAY[
        'essence', 'consciousness', 'existence', 'transcend', 'metaphysical',
        'ontological', 'epistemological', 'paradigm', 'conceptual', 'theoretical',
        'abstract', 'universal', 'infinite', 'eternal', 'absolute', 'fundamental',
        'essence', 'being', 'reality', 'truth', 'meaning', 'purpose', 'identity',
        'consciousness', 'awareness', 'perception', 'cognition', 'intuition',
        'phenomena', 'noumena', 'dialectical', 'synthesis', 'antithesis'
    ];
    word TEXT;
BEGIN
    -- Convert to lowercase and count total words
    SELECT array_length(string_to_array(lower(text_content), ' '), 1) INTO word_count;
    
    IF word_count = 0 THEN
        RETURN 0;
    END IF;
    
    -- Count abstract words
    abstract_words := 0;
    FOREACH word IN ARRAY abstract_word_list
    LOOP
        abstract_words := abstract_words + (
            SELECT COALESCE(
                array_length(
                    string_to_array(lower(text_content), word), 1
                ) - 1, 0
            )
        );
    END LOOP;
    
    -- Return ratio of abstract words to total words
    RETURN LEAST(abstract_words::FLOAT / word_count::FLOAT, 1.0);
END;
$$;

-- Now fix the other existing functions that have search path issues
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS update_last_updated_at_column();

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

-- Fix the find_similar_answers function as well
DROP FUNCTION IF EXISTS find_similar_answers(text, double precision, integer, text);

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