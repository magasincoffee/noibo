-- MAGASIN NOIBO — Workforce V2 corrective migration
-- The existing set_updated_at trigger is attached to schedule_generation_runs.
-- Phase 8/9 writes expose that the table lacked the trigger's target column.

alter table public.schedule_generation_runs
  add column if not exists updated_at timestamptz not null default now();

comment on column public.schedule_generation_runs.updated_at is
  'Technical mutation timestamp maintained by the existing set_updated_at trigger.';
