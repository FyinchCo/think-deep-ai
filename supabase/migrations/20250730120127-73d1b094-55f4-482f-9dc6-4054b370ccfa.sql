-- Create exploration_rules table for persistent rule management
CREATE TABLE public.exploration_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rabbit_hole_id UUID NOT NULL,
  rule_text TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'methodological',
  priority INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at_step INTEGER NOT NULL,
  last_modified_step INTEGER,
  effectiveness_score NUMERIC DEFAULT 0,
  trigger_condition TEXT,
  scope TEXT DEFAULT 'all',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exploration_rules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Rules are publicly viewable" 
ON public.exploration_rules 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create rules" 
ON public.exploration_rules 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update rules" 
ON public.exploration_rules 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete rules" 
ON public.exploration_rules 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_exploration_rules_updated_at
BEFORE UPDATE ON public.exploration_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_exploration_rules_rabbit_hole_id ON public.exploration_rules(rabbit_hole_id);
CREATE INDEX idx_exploration_rules_active ON public.exploration_rules(is_active) WHERE is_active = true;