-- Create breakthrough modes and seed bank tables
CREATE TABLE public.breakthrough_modes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rabbit_hole_id UUID NOT NULL REFERENCES public.rabbit_holes(id) ON DELETE CASCADE,
  mode_type TEXT NOT NULL CHECK (mode_type IN ('cascade', 'paradigm_shift', 'productive_chaos')),
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deactivated_at TIMESTAMP WITH TIME ZONE,
  trigger_reason TEXT NOT NULL,
  trigger_step INTEGER NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  effectiveness_score REAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seed bank for breakthrough explorations
CREATE TABLE public.breakthrough_seeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  domain TEXT NOT NULL,
  breakthrough_score REAL NOT NULL,
  paradigm_shift_indicators JSONB NOT NULL DEFAULT '[]',
  structural_elements JSONB NOT NULL DEFAULT '{}',
  peak_step INTEGER,
  total_steps INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create question architecture analysis table
CREATE TABLE public.question_architecture (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL UNIQUE,
  temporal_displacement_score REAL NOT NULL DEFAULT 0,
  assumption_inversion_score REAL NOT NULL DEFAULT 0,
  meta_cognitive_score REAL NOT NULL DEFAULT 0,
  constraint_paradox_score REAL NOT NULL DEFAULT 0,
  breakthrough_potential REAL NOT NULL DEFAULT 0,
  structural_patterns JSONB NOT NULL DEFAULT '{}',
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create paradigm shift detection logs
CREATE TABLE public.paradigm_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rabbit_hole_id UUID NOT NULL REFERENCES public.rabbit_holes(id) ON DELETE CASCADE,
  answer_id UUID NOT NULL REFERENCES public.answers(id) ON DELETE CASCADE,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('ontological', 'epistemological', 'methodological', 'axiological')),
  intensity_score REAL NOT NULL,
  worldview_alteration_potential REAL NOT NULL,
  conceptual_revolution_markers JSONB NOT NULL DEFAULT '[]',
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_breakthrough_modes_rabbit_hole ON public.breakthrough_modes(rabbit_hole_id);
CREATE INDEX idx_breakthrough_modes_type ON public.breakthrough_modes(mode_type);
CREATE INDEX idx_breakthrough_seeds_score ON public.breakthrough_seeds(breakthrough_score DESC);
CREATE INDEX idx_breakthrough_seeds_domain ON public.breakthrough_seeds(domain);
CREATE INDEX idx_question_architecture_potential ON public.question_architecture(breakthrough_potential DESC);
CREATE INDEX idx_paradigm_shifts_rabbit_hole ON public.paradigm_shifts(rabbit_hole_id);
CREATE INDEX idx_paradigm_shifts_intensity ON public.paradigm_shifts(intensity_score DESC);

-- Enable RLS
ALTER TABLE public.breakthrough_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breakthrough_seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_architecture ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paradigm_shifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow read access for analysis, authenticated users can create)
CREATE POLICY "Allow read access to breakthrough modes" ON public.breakthrough_modes FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on breakthrough modes" ON public.breakthrough_modes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update on breakthrough modes" ON public.breakthrough_modes FOR UPDATE USING (true);

CREATE POLICY "Allow read access to breakthrough seeds" ON public.breakthrough_seeds FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on breakthrough seeds" ON public.breakthrough_seeds FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read access to question architecture" ON public.question_architecture FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on question architecture" ON public.question_architecture FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read access to paradigm shifts" ON public.paradigm_shifts FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on paradigm shifts" ON public.paradigm_shifts FOR INSERT WITH CHECK (true);

-- Add updated_at trigger for breakthrough_seeds
CREATE TRIGGER update_breakthrough_seeds_updated_at
  BEFORE UPDATE ON public.breakthrough_seeds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to analyze question architecture
CREATE OR REPLACE FUNCTION public.analyze_question_architecture(question_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    temporal_score REAL := 0;
    assumption_score REAL := 0;
    meta_cognitive_score REAL := 0;
    constraint_score REAL := 0;
    overall_potential REAL := 0;
    patterns JSONB := '{}';
BEGIN
    question_text := lower(question_text);
    
    -- Temporal displacement indicators
    IF question_text ~ '(in 20\d{2}|future|past|always|never|timeline|history|evolution)' THEN
        temporal_score := temporal_score + 0.3;
    END IF;
    IF question_text ~ '(assume|imagine|what if|suppose)' THEN
        temporal_score := temporal_score + 0.4;
    END IF;
    IF question_text ~ '(survived|overcame|solved|transcended)' THEN
        temporal_score := temporal_score + 0.3;
    END IF;
    
    -- Assumption inversion indicators
    IF question_text ~ '(wrong|misunderstood|backwards|opposite|inverted)' THEN
        assumption_score := assumption_score + 0.4;
    END IF;
    IF question_text ~ '(question|challenge|doubt|reconsider)' THEN
        assumption_score := assumption_score + 0.3;
    END IF;
    IF question_text ~ '(fundamental|basic|core|essential)' THEN
        assumption_score := assumption_score + 0.3;
    END IF;
    
    -- Meta-cognitive framing
    IF question_text ~ '(understand|know|think|believe|perceive)' THEN
        meta_cognitive_score := meta_cognitive_score + 0.3;
    END IF;
    IF question_text ~ '(consciousness|awareness|mind|cognition)' THEN
        meta_cognitive_score := meta_cognitive_score + 0.4;
    END IF;
    IF question_text ~ '(question.*question|think.*think|know.*know)' THEN
        meta_cognitive_score := meta_cognitive_score + 0.3;
    END IF;
    
    -- Constraint paradoxes
    IF question_text ~ '(but|however|yet|although|despite)' THEN
        constraint_score := constraint_score + 0.2;
    END IF;
    IF question_text ~ '(impossible|paradox|contradiction|tension)' THEN
        constraint_score := constraint_score + 0.4;
    END IF;
    IF question_text ~ '(both.*and|neither.*nor|either.*or)' THEN
        constraint_score := constraint_score + 0.4;
    END IF;
    
    -- Cap scores at 1.0
    temporal_score := LEAST(temporal_score, 1.0);
    assumption_score := LEAST(assumption_score, 1.0);
    meta_cognitive_score := LEAST(meta_cognitive_score, 1.0);
    constraint_score := LEAST(constraint_score, 1.0);
    
    -- Calculate overall breakthrough potential
    overall_potential := (temporal_score + assumption_score + meta_cognitive_score + constraint_score) / 4.0;
    
    -- Store structural patterns
    patterns := jsonb_build_object(
        'word_count', array_length(string_to_array(trim(question_text), ' '), 1),
        'question_marks', length(question_text) - length(replace(question_text, '?', '')),
        'complexity_indicators', CASE 
            WHEN question_text ~ '(complex|complicated|nuanced|multifaceted)' THEN true 
            ELSE false 
        END,
        'scope_indicators', CASE
            WHEN question_text ~ '(everything|all|universe|existence|reality)' THEN 'universal'
            WHEN question_text ~ '(human|society|civilization|culture)' THEN 'social'
            WHEN question_text ~ '(individual|person|self|mind)' THEN 'personal'
            ELSE 'specific'
        END
    );
    
    RETURN jsonb_build_object(
        'temporal_displacement', temporal_score,
        'assumption_inversion', assumption_score,
        'meta_cognitive', meta_cognitive_score,
        'constraint_paradox', constraint_score,
        'breakthrough_potential', overall_potential,
        'patterns', patterns
    );
END;
$$;