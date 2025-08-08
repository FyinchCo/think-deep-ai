-- Create helpful indexes for orchestrator selection and locking
CREATE INDEX IF NOT EXISTS automation_runs_due_active_idx
ON public.automation_runs (next_run_at)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS automation_runs_in_progress_idx
ON public.automation_runs (in_progress_until)
WHERE in_progress_until IS NOT NULL;