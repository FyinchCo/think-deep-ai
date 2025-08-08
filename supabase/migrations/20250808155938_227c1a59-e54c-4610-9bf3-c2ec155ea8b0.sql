-- Add orchestrator lock and config columns, and event payload
alter table public.automation_runs
  add column if not exists in_progress_until timestamptz,
  add column if not exists auto_select_enabled boolean not null default true;

alter table public.automation_events
  add column if not exists payload jsonb not null default '{}'::jsonb;

-- Helpful index for lock expiration queries
create index if not exists idx_automation_runs_inprogress on public.automation_runs(in_progress_until);
