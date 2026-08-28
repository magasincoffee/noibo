-- MAGASIN NOIBO — Workforce RPC/API V1
-- Scope: controlled Supabase API for Workforce V2.
-- This phase does not publish schedules or mutate official work_schedules.

create or replace function public.save_my_availability(
  p_availability_id uuid default null,
  p_work_date date default null,
  p_start_time time default null,
  p_end_time time default null,
  p_availability_type text default 'AVAILABLE',
  p_preferred_store_id uuid default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_role text := public.current_user_role();
  v_user uuid := auth.uid();
  v_type text := upper(coalesce(trim(p_availability_type), 'AVAILABLE'));
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_work_date is null or p_start_time is null or p_end_time is null then
    raise exception 'AVAILABILITY_TIME_REQUIRED';
  end if;
  if p_end_time <= p_start_time then
    raise exception 'INVALID_AVAILABILITY_INTERVAL';
  end if;
  if v_type not in ('AVAILABLE','UNAVAILABLE','PREFERRED') then
    raise exception 'INVALID_AVAILABILITY_TYPE';
  end if;
  if p_preferred_store_id is not null and v_role <> 'OWNER' and not public.can_access_store(p_preferred_store_id) then
    raise exception 'STORE_NOT_ALLOWED';
  end if;

  if p_availability_id is null then
    insert into public.employee_availability (
      user_id, work_date, start_time, end_time,
      preferred_store_id, availability_type, note
    )
    values (
      v_user, p_work_date, p_start_time, p_end_time,
      p_preferred_store_id, v_type, p_note
    )
    returning id into v_id;
  else
    if v_role <> 'OWNER' and not exists (
      select 1 from public.employee_availability
      where id = p_availability_id and user_id = v_user
    ) then
      raise exception 'AVAILABILITY_NOT_FOUND';
    end if;

    update public.employee_availability
       set work_date = p_work_date,
           start_time = p_start_time,
           end_time = p_end_time,
           preferred_store_id = p_preferred_store_id,
           availability_type = v_type,
           note = p_note
     where id = p_availability_id
     returning id into v_id;

    if v_id is null then
      raise exception 'AVAILABILITY_NOT_FOUND';
    end if;
  end if;

  return v_id;
end;
$$;

grant execute on function public.save_my_availability(uuid, date, time, time, text, uuid, text) to authenticated;
revoke execute on function public.save_my_availability(uuid, date, time, time, text, uuid, text) from anon, public;

create or replace function public.delete_my_availability(p_availability_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.current_user_role();
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  delete from public.employee_availability
   where id = p_availability_id
     and (user_id = v_user or v_role = 'OWNER');
  return found;
end;
$$;

grant execute on function public.delete_my_availability(uuid) to authenticated;
revoke execute on function public.delete_my_availability(uuid) from anon, public;

create or replace function public.get_my_availability(p_week_start date default null)
returns table (
  id uuid,
  work_date date,
  start_time time,
  end_time time,
  preferred_store_id uuid,
  availability_type text,
  note text,
  updated_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select ea.id, ea.work_date, ea.start_time, ea.end_time,
         ea.preferred_store_id, ea.availability_type, ea.note, ea.updated_at
    from public.employee_availability ea
   where ea.user_id = auth.uid()
     and (
       p_week_start is null
       or ea.work_date between p_week_start and p_week_start + 6
     )
   order by ea.work_date, ea.start_time, ea.end_time, ea.id;
$$;

grant execute on function public.get_my_availability(date) to authenticated;
revoke execute on function public.get_my_availability(date) from anon, public;

create or replace function public.get_workforce_staffing_requirements(
  p_store_id uuid default null,
  p_week_start date default null
)
returns table (
  id uuid,
  store_id uuid,
  store_code text,
  store_name text,
  work_date date,
  start_time time,
  end_time time,
  skill_code text,
  min_skill_level integer,
  minimum_headcount integer,
  target_headcount integer,
  maximum_headcount integer,
  status text,
  note text
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_role text := public.current_user_role();
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then
    raise exception 'ROLE_NOT_ALLOWED';
  end if;
  if v_role = 'STORE_MANAGER' and p_store_id is not null and not public.can_access_store(p_store_id) then
    raise exception 'STORE_NOT_ALLOWED';
  end if;

  return query
  select sr.id, sr.store_id, s.code, s.name, sr.work_date,
         sr.start_time, sr.end_time, sr.skill_code, sr.min_skill_level,
         sr.minimum_headcount, sr.target_headcount, sr.maximum_headcount,
         sr.status, sr.note
    from public.staffing_requirements sr
    join public.stores s on s.id = sr.store_id
   where (p_store_id is null or sr.store_id = p_store_id)
     and (p_week_start is null or sr.work_date between p_week_start and p_week_start + 6)
     and public.can_access_store(sr.store_id)
   order by sr.work_date, sr.start_time, sr.end_time, sr.store_id, sr.id;
end;
$$;

grant execute on function public.get_workforce_staffing_requirements(uuid, date) to authenticated;
revoke execute on function public.get_workforce_staffing_requirements(uuid, date) from anon, public;

create or replace function public.upsert_workforce_staffing_requirement(
  p_requirement_id uuid default null,
  p_store_id uuid default null,
  p_work_date date default null,
  p_start_time time default null,
  p_end_time time default null,
  p_skill_code text default null,
  p_min_skill_level integer default 0,
  p_minimum_headcount integer default 0,
  p_target_headcount integer default 0,
  p_maximum_headcount integer default 0,
  p_status text default 'ACTIVE',
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_role text := public.current_user_role();
  v_status text := upper(coalesce(trim(p_status), 'ACTIVE'));
  v_skill text := nullif(trim(coalesce(p_skill_code, '')), '');
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if p_store_id is null or p_work_date is null or p_start_time is null or p_end_time is null then
    raise exception 'STAFFING_REQUIREMENT_FIELDS_REQUIRED';
  end if;
  if not public.can_access_store(p_store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;
  if p_end_time <= p_start_time then raise exception 'INVALID_STAFFING_INTERVAL'; end if;
  if p_min_skill_level < 0 or p_min_skill_level > 4 then raise exception 'INVALID_MIN_SKILL_LEVEL'; end if;
  if p_minimum_headcount < 0 or p_target_headcount < p_minimum_headcount or p_maximum_headcount < p_target_headcount then
    raise exception 'INVALID_HEADCOUNT_HIERARCHY';
  end if;
  if v_status not in ('ACTIVE','INACTIVE') then raise exception 'INVALID_STAFFING_STATUS'; end if;
  if v_skill is null and p_min_skill_level <> 0 then raise exception 'GENERIC_REQUIREMENT_SKILL_LEVEL_MUST_BE_ZERO'; end if;

  if p_requirement_id is null then
    insert into public.staffing_requirements (
      store_id, work_date, start_time, end_time, skill_code,
      min_skill_level, minimum_headcount, target_headcount,
      maximum_headcount, status, note, created_by
    ) values (
      p_store_id, p_work_date, p_start_time, p_end_time, v_skill,
      p_min_skill_level, p_minimum_headcount, p_target_headcount,
      p_maximum_headcount, v_status, p_note, auth.uid()
    ) returning id into v_id;
  else
    if not exists (select 1 from public.staffing_requirements where id = p_requirement_id) then
      raise exception 'STAFFING_REQUIREMENT_NOT_FOUND';
    end if;
    update public.staffing_requirements
       set store_id = p_store_id,
           work_date = p_work_date,
           start_time = p_start_time,
           end_time = p_end_time,
           skill_code = v_skill,
           min_skill_level = p_min_skill_level,
           minimum_headcount = p_minimum_headcount,
           target_headcount = p_target_headcount,
           maximum_headcount = p_maximum_headcount,
           status = v_status,
           note = p_note
     where id = p_requirement_id
     returning id into v_id;
  end if;
  return v_id;
end;
$$;

grant execute on function public.upsert_workforce_staffing_requirement(uuid, uuid, date, time, time, text, integer, integer, integer, integer, text, text) to authenticated;
revoke execute on function public.upsert_workforce_staffing_requirement(uuid, uuid, date, time, time, text, integer, integer, integer, integer, text, text) from anon, public;

create or replace function public.create_schedule_generation(
  p_store_id uuid,
  p_week_start date,
  p_algorithm_version text default 'RULE_V1'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_role text := public.current_user_role();
  v_algorithm text := coalesce(nullif(trim(p_algorithm_version), ''), 'RULE_V1');
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if p_store_id is null or p_week_start is null then raise exception 'GENERATION_FIELDS_REQUIRED'; end if;
  if extract(isodow from p_week_start) <> 1 then raise exception 'WEEK_START_MUST_BE_MONDAY'; end if;
  if v_role = 'STORE_MANAGER' and not public.can_access_store(p_store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;

  insert into public.schedule_generation_runs (
    store_id, week_start, week_end, algorithm_version, status, created_by
  ) values (
    p_store_id, p_week_start, p_week_start + 6, v_algorithm, 'DRAFT', auth.uid()
  ) returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.create_schedule_generation(uuid, date, text) to authenticated;
revoke execute on function public.create_schedule_generation(uuid, date, text) from anon, public;

create or replace function public.get_schedule_generation(p_generation_id uuid)
returns table (
  id uuid,
  store_id uuid,
  store_code text,
  store_name text,
  week_start date,
  week_end date,
  algorithm_version text,
  status text,
  total_hours numeric,
  estimated_cost numeric,
  coverage_score numeric,
  skill_coverage_score numeric,
  created_by uuid,
  created_at timestamptz,
  published_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_role text := public.current_user_role();
  v_store uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select sgr.store_id into v_store from public.schedule_generation_runs sgr where sgr.id = p_generation_id;
  if v_store is null and not exists(select 1 from public.schedule_generation_runs where id=p_generation_id and store_id is null) then
    raise exception 'GENERATION_NOT_FOUND';
  end if;
  if v_role = 'STORE_MANAGER' and v_store is not null and not public.can_access_store(v_store) then
    raise exception 'STORE_NOT_ALLOWED';
  end if;
  if v_role not in ('OWNER','STORE_MANAGER') and not exists(
    select 1 from public.schedule_generation_runs sgr
    where sgr.id=p_generation_id and sgr.created_by=auth.uid()
  ) then raise exception 'ROLE_NOT_ALLOWED'; end if;

  return query
  select sgr.id, sgr.store_id, s.code, s.name, sgr.week_start, sgr.week_end,
         sgr.algorithm_version, sgr.status, sgr.total_hours, sgr.estimated_cost,
         sgr.coverage_score, sgr.skill_coverage_score, sgr.created_by,
         sgr.created_at, sgr.published_at
    from public.schedule_generation_runs sgr
    left join public.stores s on s.id = sgr.store_id
   where sgr.id = p_generation_id;
end;
$$;

grant execute on function public.get_schedule_generation(uuid) to authenticated;
revoke execute on function public.get_schedule_generation(uuid) from anon, public;

create or replace function public.replace_schedule_generation_assignments(
  p_generation_id uuid,
  p_assignments jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.current_user_role();
  v_store uuid;
  v_week_start date;
  v_week_end date;
  v_status text;
  v_item jsonb;
  v_count integer := 0;
  v_user uuid;
  v_store_id uuid;
  v_work_date date;
  v_start time;
  v_end time;
  v_skill text;
  v_level integer;
  v_score numeric;
  v_warning text;
  v_note text;
  v_assignment_status text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if jsonb_typeof(coalesce(p_assignments, '[]'::jsonb)) <> 'array' then raise exception 'ASSIGNMENTS_MUST_BE_ARRAY'; end if;

  select store_id, week_start, week_end, status
    into v_store, v_week_start, v_week_end, v_status
    from public.schedule_generation_runs
   where id = p_generation_id
   for update;
  if not found then raise exception 'GENERATION_NOT_FOUND'; end if;
  if v_status <> 'DRAFT' then raise exception 'GENERATION_NOT_DRAFT'; end if;
  if v_role = 'STORE_MANAGER' and v_store is not null and not public.can_access_store(v_store) then raise exception 'STORE_NOT_ALLOWED'; end if;

  delete from public.schedule_generation_assignments where generation_id = p_generation_id;

  for v_item in select value from jsonb_array_elements(p_assignments)
  loop
    v_user := nullif(v_item->>'user_id','')::uuid;
    v_store_id := nullif(v_item->>'store_id','')::uuid;
    v_work_date := (v_item->>'work_date')::date;
    v_start := (v_item->>'start_time')::time;
    v_end := (v_item->>'end_time')::time;
    v_skill := nullif(trim(v_item->>'skill_code'),'');
    v_level := coalesce(nullif(v_item->>'skill_level','')::integer, 0);
    v_score := coalesce(nullif(v_item->>'score','')::numeric, 0);
    v_warning := nullif(v_item->>'warning','');
    v_note := nullif(v_item->>'note','');
    v_assignment_status := upper(coalesce(nullif(v_item->>'status',''), 'DRAFT'));

    if v_user is null or v_store_id is null or v_work_date is null or v_start is null or v_end is null then
      raise exception 'ASSIGNMENT_REQUIRED_FIELDS_MISSING';
    end if;
    if v_end <= v_start then raise exception 'INVALID_ASSIGNMENT_INTERVAL'; end if;
    if v_work_date < v_week_start or v_work_date > v_week_end then raise exception 'ASSIGNMENT_OUTSIDE_GENERATION_WEEK'; end if;
    if v_store is not null and v_store_id <> v_store then raise exception 'ASSIGNMENT_STORE_MISMATCH'; end if;
    if v_role = 'STORE_MANAGER' and not public.can_access_store(v_store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;
    if not exists(select 1 from public.profiles where id=v_user and status='ACTIVE') then raise exception 'ASSIGNMENT_EMPLOYEE_INACTIVE'; end if;
    if v_level < 0 or v_level > 4 then raise exception 'INVALID_ASSIGNMENT_SKILL_LEVEL'; end if;
    if v_assignment_status not in ('DRAFT','ACCEPTED','REJECTED','CANCELLED') then raise exception 'INVALID_ASSIGNMENT_STATUS'; end if;

    if exists (
      select 1
        from public.schedule_generation_assignments a
       where a.generation_id = p_generation_id
         and a.user_id = v_user
         and a.work_date = v_work_date
         and a.start_time < v_end
         and a.end_time > v_start
    ) then
      raise exception 'ASSIGNMENT_OVERLAP';
    end if;

    insert into public.schedule_generation_assignments (
      generation_id, user_id, store_id, work_date,
      start_time, end_time, skill_code, skill_level,
      score, warning, status, note
    ) values (
      p_generation_id, v_user, v_store_id, v_work_date,
      v_start, v_end, v_skill, v_level,
      v_score, v_warning, v_assignment_status, v_note
    );
    v_count := v_count + 1;
  end loop;

  update public.schedule_generation_runs sgr
     set total_hours = coalesce((
           select sum(extract(epoch from (a.end_time - a.start_time)) / 3600.0)
             from public.schedule_generation_assignments a
            where a.generation_id = sgr.id
         ), 0)
   where sgr.id = p_generation_id;

  return v_count;
end;
$$;

grant execute on function public.replace_schedule_generation_assignments(uuid, jsonb) to authenticated;
revoke execute on function public.replace_schedule_generation_assignments(uuid, jsonb) from anon, public;

create or replace function public.get_schedule_generation_assignments(p_generation_id uuid)
returns table (
  id uuid,
  generation_id uuid,
  user_id uuid,
  employee_name text,
  store_id uuid,
  store_code text,
  work_date date,
  start_time time,
  end_time time,
  skill_code text,
  skill_level integer,
  score numeric,
  warning text,
  status text,
  note text
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_role text := public.current_user_role();
  v_store uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select store_id into v_store from public.schedule_generation_runs where id=p_generation_id;
  if not found then raise exception 'GENERATION_NOT_FOUND'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then
    if not exists(select 1 from public.schedule_generation_runs where id=p_generation_id and created_by=auth.uid()) then
      raise exception 'ROLE_NOT_ALLOWED';
    end if;
  elsif v_role='STORE_MANAGER' and v_store is not null and not public.can_access_store(v_store) then
    raise exception 'STORE_NOT_ALLOWED';
  end if;

  return query
  select a.id, a.generation_id, a.user_id, p.full_name,
         a.store_id, s.code, a.work_date, a.start_time, a.end_time,
         a.skill_code, a.skill_level, a.score, a.warning, a.status, a.note
    from public.schedule_generation_assignments a
    join public.profiles p on p.id=a.user_id
    join public.stores s on s.id=a.store_id
   where a.generation_id=p_generation_id
   order by a.work_date, a.start_time, a.store_id, a.user_id, a.id;
end;
$$;

grant execute on function public.get_schedule_generation_assignments(uuid) to authenticated;
revoke execute on function public.get_schedule_generation_assignments(uuid) from anon, public;

create or replace function public.cancel_schedule_generation(p_generation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.current_user_role();
  v_store uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  select store_id into v_store from public.schedule_generation_runs where id=p_generation_id for update;
  if not found then raise exception 'GENERATION_NOT_FOUND'; end if;
  if v_role='STORE_MANAGER' and v_store is not null and not public.can_access_store(v_store) then raise exception 'STORE_NOT_ALLOWED'; end if;
  update public.schedule_generation_runs set status='CANCELLED' where id=p_generation_id and status='DRAFT';
  return found;
end;
$$;

grant execute on function public.cancel_schedule_generation(uuid) to authenticated;
revoke execute on function public.cancel_schedule_generation(uuid) from anon, public;

comment on function public.save_my_availability(uuid, date, time, time, text, uuid, text) is
  'Employee self-service availability API. Date-specific V1; no overnight intervals.';
comment on function public.upsert_workforce_staffing_requirement(uuid, uuid, date, time, time, text, integer, integer, integer, integer, text, text) is
  'Controlled staffing-demand API. Store scope is enforced server-side.';
comment on function public.create_schedule_generation(uuid, date, text) is
  'Creates a DRAFT generation only. Never publishes official work_schedules.';
comment on function public.replace_schedule_generation_assignments(uuid, jsonb) is
  'Atomically replaces a DRAFT generation assignment set after structural checks. Detailed scheduler validation remains a separate gate.';
comment on function public.cancel_schedule_generation(uuid) is
  'Cancels a DRAFT generation. Does not mutate official work_schedules.';
