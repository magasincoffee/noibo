-- MAGASIN NOIBO — Workforce data integrity V1
-- Phase 1: tighten the existing Workforce V2 model without changing
-- scheduling behavior, adding new runtime workflow, or importing data.

-- 1. Keep generation week boundaries internally consistent.
alter table public.schedule_generation_runs
  drop constraint if exists schedule_generation_runs_week_range_check;

alter table public.schedule_generation_runs
  add constraint schedule_generation_runs_week_range_check
  check (week_end = week_start + 6);

-- 2. A generic staffing requirement has no skill-level meaning.
alter table public.staffing_requirements
  drop constraint if exists staffing_requirements_generic_skill_level_check;

alter table public.staffing_requirements
  add constraint staffing_requirements_generic_skill_level_check
  check (skill_code is not null or min_skill_level = 0);

-- 3. Preserve updated_at semantics for the generation run entity.
drop trigger if exists trg_schedule_generation_runs_updated_at
  on public.schedule_generation_runs;
create trigger trg_schedule_generation_runs_updated_at
before update on public.schedule_generation_runs
for each row execute function public.set_updated_at();

-- Generation assignments are mutable during review/revalidation, but the
-- current schema has no updated_at column. Their state is represented by
-- status/note and the parent generation lifecycle in V1.

-- 4. Indexes for the scheduler's primary access patterns.
create index if not exists idx_employee_availability_user_date_end
  on public.employee_availability(user_id, work_date, end_time);

create index if not exists idx_employee_skills_skill_level
  on public.employee_skills(skill_code, level)
  where status = 'ACTIVE';

create index if not exists idx_employee_constraints_store_status
  on public.employee_constraints(preferred_store_id, status);

create index if not exists idx_staffing_requirements_store_date_skill
  on public.staffing_requirements(store_id, work_date, skill_code, start_time);

create index if not exists idx_schedule_generation_assignments_user_date
  on public.schedule_generation_assignments(user_id, work_date, start_time);

create index if not exists idx_schedule_generation_assignments_store_date
  on public.schedule_generation_assignments(store_id, work_date, start_time);

-- 5. Explicit data-model documentation for V1 semantics.
comment on column public.employee_availability.availability_type is
  'V1: AVAILABLE and PREFERRED are workable windows; UNAVAILABLE excludes overlapping assignments.';

comment on column public.employee_constraints.max_daily_hours is
  'V1 hard cap; value 0 means no configured daily limit.';

comment on column public.employee_constraints.max_weekly_hours is
  'V1 hard cap; value 0 means no configured weekly limit.';

comment on column public.employee_constraints.min_rest_hours is
  'V1 hard minimum rest between assigned intervals; value 0 means no configured rest limit.';

comment on column public.staffing_requirements.minimum_headcount is
  'Coverage below this level is a hard shortage for the requirement interval.';

comment on column public.staffing_requirements.target_headcount is
  'Preferred coverage objective; it must not exceed maximum_headcount.';

comment on column public.staffing_requirements.maximum_headcount is
  'Hard upper bound; effective coverage must never exceed this value.';

comment on column public.schedule_generation_runs.algorithm_version is
  'Stable deterministic rule-set identifier for the generated draft.';

comment on column public.schedule_generation_assignments.warning is
  'Human-readable non-fatal warning or validation explanation; hard violations block publication in later phases.';
