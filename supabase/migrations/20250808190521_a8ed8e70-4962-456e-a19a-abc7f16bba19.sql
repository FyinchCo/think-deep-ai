-- Add p1_mode_strategy to control Phase 1 engine selection
ALTER TABLE public.automation_runs
ADD COLUMN IF NOT EXISTS p1_mode_strategy text NOT NULL DEFAULT 'single';

-- Optional: comment for clarity
COMMENT ON COLUMN public.automation_runs.p1_mode_strategy IS 'Phase 1 mode strategy: single (default) or cycling';