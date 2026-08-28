-- MAGASIN NOIBO — Workforce Scheduling V2
-- Prepared for the Supabase runtime. This migration is additive and does not
-- modify existing work_schedules data.

create table if not exists public.employee_availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  preferred_store_id uuid references public.stores(id),
  availability_type text not null default 'AVAILABLE'
    check (availability_type in ('AVAILABLE','UNAVAILABLE','PREFERRED')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table if not exists public.employee_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_code text not null,
  level integer not null default 0 check (level between 0 and 4),
  can_work_alone boolean not null default false,
  can_mentor boolean not null default false,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE','INACTIVE')),
  note text,
  updated_at timestamptz not null default now(),
  unique (user_id, skill_code)
);

create table if not exists public.employee_constraints (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  employment_type text not null default 'PART_TIME'
    check (employment_type in ('PART_TIME','FULL_TIME','INTERN','OTHER')),
  max_daily_hours numeric(5,2) not null default 0 check (max_daily_hours >= 0),
  max_weekly_hours numeric(6,2) not null default 0 check (max_weekly_hours >= 0),
  min_rest_hours numeric(5,2) not null default 0 check (min_rest_hours >= 0),
  can_work_alone boolean not null default false,
  mentor_required boolean not null default false,
  preferred_store_id uuid references public.stores(id),
  allowed_store_ids uuid[] not null default '{}',
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE','INACTIVE')),
  note text,
  updated_at timestamptz not null default now()
);

create table if not exists public.staffing_requirements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  skill_code text,
  min_skill_level integer not null default 0 check (min_skill_level between 0 and 4),
  minimum_headcount integer not null default 0 check (minimum_headcount >= 0),
  target_headcount integer not null default 0 check (target_headcount >= minimum_headcount),
  maximum_headcount integer not null default 0 check (maximum_headcount >= target_headcount),
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE','INACTIVE')),
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table if not exists public.schedule_generation_runs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  algorithm_version text not null default 'RULE_V1',
  status text not null default 'DRAFT'
    check (status in ('DRAFT','REVIEWED','PUBLISHED','CANCELLED')),
  total_hours numeric(10,2) not null default 0,
  estimated_cost numeric(14,2) not null default 0,
  coverage_score numeric(6,2) not null default 0,
  skill_coverage_score numeric(6,2) not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.schedule_generation_assignments (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.schedule_generation_runs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  skill_code text,
  skill_level integer not null default 0 check (skill_level between 0 and 4),
  score numeric(10,2) not null default 0,
  warning text,
  status text not null default 'DRAFT'
    check (status in ('DRAFT','ACCEPTED','REJECTED','CANCELLED')),
  note text,
  check (end_time > start_time)
);

create index if not exists idx_employee_availability_user_date
  on public.employee_availability(user_id, work_date, start_time);
create index if not exists idx_employee_availability_store_date
  on public.employee_availability(preferred_store_id, work_date);
create index if not exists idx_staffing_requirements_store_date
  on public.staffing_requirements(store_id, work_date, start_time);
create index if not exists idx_schedule_generation_store_week
  on public.schedule_generation_runs(store_id, week_start);
create index if not exists idx_schedule_generation_assignment_generation
  on public.schedule_generation_assignments(generation_id);

-- Updated-at triggers.
drop trigger if exists trg_employee_availability_updated_at on public.employee_availability;
create trigger trg_employee_availability_updated_at
before update on public.employee_availability
for each row execute function public.set_updated_at();

drop trigger if exists trg_employee_skills_updated_at on public.employee_skills;
create trigger trg_employee_skills_updated_at
before update on public.employee_skills
for each row execute function public.set_updated_at();

drop trigger if exists trg_employee_constraints_updated_at on public.employee_constraints;
create trigger trg_employee_constraints_updated_at
before update on public.employee_constraints
for each row execute function public.set_updated_at();

drop trigger if exists trg_staffing_requirements_updated_at on public.staffing_requirements;
create trigger trg_staffing_requirements_updated_at
before update on public.staffing_requirements
for each row execute function public.set_updated_at();

alter table public.employee_availability enable row level security;
alter table public.employee_skills enable row level security;
alter table public.employee_constraints enable row level security;
alter table public.staffing_requirements enable row level security;
alter table public.schedule_generation_runs enable row level security;
alter table public.schedule_generation_assignments enable row level security;

-- Availability: employees manage their own availability; managers/OWNER read it.
drop policy if exists employee_availability_select on public.employee_availability;
create policy employee_availability_select on public.employee_availability
for select to authenticated
using (
  user_id = auth.uid()
  or public.current_user_role() = 'OWNER'
  or public.current_user_role() = 'STORE_MANAGER'
);

drop policy if exists employee_availability_write on public.employee_availability;
create policy employee_availability_write on public.employee_availability
for all to authenticated
using (user_id = auth.uid() or public.current_user_role() = 'OWNER')
with check (user_id = auth.uid() or public.current_user_role() = 'OWNER');

-- Skills: self-read; managers and OWNER can read/write.
drop policy if exists employee_skills_select on public.employee_skills;
create policy employee_skills_select on public.employee_skills
for select to authenticated
using (user_id = auth.uid() or public.current_user_role() in ('OWNER','STORE_MANAGER'));

drop policy if exists employee_skills_manager_write on public.employee_skills;
create policy employee_skills_manager_write on public.employee_skills
for all to authenticated
using (public.current_user_role() in ('OWNER','STORE_MANAGER'))
with check (public.current_user_role() in ('OWNER','STORE_MANAGER'));

-- Constraints: self-read, manager/OWNER manage.
drop policy if exists employee_constraints_select on public.employee_constraints;
create policy employee_constraints_select on public.employee_constraints
for select to authenticated
using (user_id = auth.uid() or public.current_user_role() in ('OWNER','STORE_MANAGER'));

drop policy if exists employee_constraints_manager_write on public.employee_constraints;
create policy employee_constraints_manager_write on public.employee_constraints
for all to authenticated
using (public.current_user_role() in ('OWNER','STORE_MANAGER'))
with check (public.current_user_role() in ('OWNER','STORE_MANAGER'));

-- Staffing requirements: OWNER manages; managers read requirements inside their scope.
drop policy if exists staffing_requirements_select on public.staffing_requirements;
create policy staffing_requirements_select on public.staffing_requirements
for select to authenticated
using (
  public.current_user_role() = 'OWNER'
  or (public.current_user_role() = 'STORE_MANAGER' and public.can_access_store(store_id))
);

drop policy if exists staffing_requirements_owner_write on public.staffing_requirements;
create policy staffing_requirements_owner_write on public.staffing_requirements
for all to authenticated
using (public.current_user_role() = 'OWNER')
with check (public.current_user_role() = 'OWNER');

-- Draft generation runs/assignments: managers review only within their scope; only OWNER/manager create.
drop policy if exists schedule_generation_runs_select on public.schedule_generation_runs;
create policy schedule_generation_runs_select on public.schedule_generation_runs
for select to authenticated
using (
  public.current_user_role() = 'OWNER'
  or (public.current_user_role() = 'STORE_MANAGER' and public.can_access_store(store_id))
);

drop policy if exists schedule_generation_assignments_select on public.schedule_generation_assignments;
create policy schedule_generation_assignments_select on public.schedule_generation_assignments
for select to authenticated
using (
  user_id = auth.uid()
  or public.current_user_role() = 'OWNER'
  or (public.current_user_role() = 'STORE_MANAGER' and public.can_access_store(store_id))
);

comment on table public.employee_availability is 'Employee-reported time windows when the employee can work.';
comment on table public.employee_skills is 'Verified operational skills and competency levels used by the scheduler.';
comment on table public.employee_constraints is 'Employment type, hour limits, mentor/training and store constraints.';
comment on table public.staffing_requirements is 'OWNER-defined staffing demand by store, date, time window and skill.';
comment on table public.schedule_generation_runs is 'Scheduler generation metadata; never published automatically.';
comment on table public.schedule_generation_assignments is 'Assignments produced by a scheduler run before publishing.';
