-- Add mode transition tracking to events table
-- This enables mode effectiveness analysis by capturing before/after states

-- First, let's add a helper function to calculate abstraction level from text
CREATE OR REPLACE FUNCTION calculate_abstraction_level(text_content TEXT)
RETURNS FLOAT
LANGUAGE plpgsql
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