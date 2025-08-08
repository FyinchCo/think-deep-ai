-- Enable required extensions
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Automation tables
create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  rabbit_hole_id uuid not null,
  status text not null default 'active', -- active|paused|completed|failed
  phase text not null default 'phase1',  -- phase1|phase2
  p1_target_steps int not null default 10,
  p1_delay_sec int not null default 5,
  p1_early_stop boolean not null default true,
  p1_steps_completed int not null default 0,
  research_mode_p1 boolean not null default false,
  p2_rounds int not null default 3,
  p2_rounds_completed int not null default 0,
  research_mode_p2 boolean not null default true,
  next_run_at timestamptz not null default now(),
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for efficient scheduling
create index if not exists idx_automation_runs_status_next_run on public.automation_runs(status, next_run_at);
create index if not exists idx_automation_runs_user on public.automation_runs(user_id);

-- Ensure updated_at trigger exists
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = 'public';

drop trigger if exists trg_automation_runs_updated_at on public.automation_runs;
create trigger trg_automation_runs_updated_at
before update on public.automation_runs
for each row execute function public.update_updated_at_column();

-- RLS
alter table public.automation_runs enable row level security;

drop policy if exists "Users can view their own runs" on public.automation_runs;
create policy "Users can view their own runs" on public.automation_runs
for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own runs" on public.automation_runs;
create policy "Users can insert their own runs" on public.automation_runs
for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own runs" on public.automation_runs;
create policy "Users can update their own runs" on public.automation_runs
for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own runs" on public.automation_runs;
create policy "Users can delete their own runs" on public.automation_runs
for delete using (auth.uid() = user_id);

-- Simple event log
create table if not exists public.automation_events (
  id bigserial primary key,
  run_id uuid not null references public.automation_runs(id) on delete cascade,
  at timestamptz not null default now(),
  level text not null default 'info',
  message text
);

alter table public.automation_events enable row level security;

drop policy if exists "Users can view their own run events" on public.automation_events;
create policy "Users can view their own run events" on public.automation_events
for select using (exists (select 1 from public.automation_runs r where r.id = run_id and r.user_id = auth.uid()));

-- Schedule the orchestrator every minute (idempotent)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'full-cycle-orchestrator-every-minute') then
    perform cron.unschedule((select jobid from cron.job where jobname = 'full-cycle-orchestrator-every-minute'));
  end if;
  perform cron.schedule(
    'full-cycle-orchestrator-every-minute',
    '* * * * *',
    'select net.http_post(\n        url := ''https://oypsdwgvjwycgjxfqndi.supabase.co/functions/v1/full-cycle-orchestrator'',\n        headers := ''{""Content-Type"": ""application/json"", ""Authorization"": ""Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cHNkd2d2and5Y2dqeGZxbmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3OTM0NTIsImV4cCI6MjA2ODM2OTQ1Mn0.3skUK76WwbgB_C2XMquqw7XUZQKuCI-VwERYlRFcrPI""}''::jsonb,\n        body := ''{}''::jsonb\n      );'
  );
exception when others then
  -- Ignore errors to keep migration idempotent across environments
  null;
end $$;