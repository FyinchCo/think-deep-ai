-- Create tables for the Incremental Value AI Rabbit Hole system

-- Rabbit holes table (main sessions)
CREATE TABLE public.rabbit_holes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    initial_question TEXT NOT NULL,
    domain TEXT NOT NULL DEFAULT 'philosophy',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stalled', 'completed', 'archived')),
    total_steps INTEGER NOT NULL DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE public.rabbit_holes ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (for PoC)
CREATE POLICY "Rabbit holes are publicly viewable" 
ON public.rabbit_holes 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create rabbit holes" 
ON public.rabbit_holes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update rabbit holes" 
ON public.rabbit_holes 
FOR UPDATE 
USING (true);

-- Answers table (individual steps in the chain)
CREATE TABLE public.answers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    rabbit_hole_id UUID NOT NULL REFERENCES public.rabbit_holes(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    answer_text TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_valid BOOLEAN NOT NULL DEFAULT true,
    judge_scores JSONB,
    judge_feedback TEXT,
    parent_answer_id UUID REFERENCES public.answers(id),
    generator_prompt_details JSONB,
    judge_prompt_details JSONB,
    retry_count INTEGER NOT NULL DEFAULT 0,
    generator_model TEXT,
    judge_model TEXT,
    UNIQUE(rabbit_hole_id, step_number)
);

-- Enable Row Level Security
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Answers are publicly viewable" 
ON public.answers 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create answers" 
ON public.answers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update answers" 
ON public.answers 
FOR UPDATE 
USING (true);

-- Events table for logging and analytics
CREATE TABLE public.events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    rabbit_hole_id UUID REFERENCES public.rabbit_holes(id),
    answer_id UUID REFERENCES public.answers(id),
    payload JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Events are publicly viewable" 
ON public.events 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create events" 
ON public.events 
FOR INSERT 
WITH CHECK (true);

-- Settings table for config-as-data
CREATE TABLE public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policies for settings
CREATE POLICY "Settings are publicly viewable" 
ON public.settings 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can manage settings" 
ON public.settings 
FOR ALL 
USING (true);

-- Insert initial settings
INSERT INTO public.settings (key, value, description) VALUES
('generator_model', '"gpt-4o-mini"', 'Primary model for content generation'),
('judge_model', '"gpt-4o-mini"', 'Model for judging incremental value'),
('max_retries', '3', 'Maximum retry attempts per step'),
('generator_temperature', '0.7', 'Temperature for generator model'),
('judge_temperature', '0.1', 'Temperature for judge model (lower for consistency)'),
('novelty_threshold', '0.7', 'Minimum novelty score to pass'),
('depth_threshold', '0.6', 'Minimum depth score to pass'),
('coherence_threshold', '0.8', 'Minimum coherence score to pass');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_rabbit_holes_updated_at
    BEFORE UPDATE ON public.rabbit_holes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_rabbit_holes_status ON public.rabbit_holes(status);
CREATE INDEX idx_rabbit_holes_created_at ON public.rabbit_holes(created_at DESC);
CREATE INDEX idx_answers_rabbit_hole_id ON public.answers(rabbit_hole_id);
CREATE INDEX idx_answers_step_number ON public.answers(rabbit_hole_id, step_number);
CREATE INDEX idx_answers_is_valid ON public.answers(is_valid);
CREATE INDEX idx_events_rabbit_hole_id ON public.events(rabbit_hole_id);
CREATE INDEX idx_events_timestamp ON public.events(timestamp DESC);
CREATE INDEX idx_events_type ON public.events(event_type);