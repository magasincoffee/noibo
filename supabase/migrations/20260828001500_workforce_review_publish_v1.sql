-- MAGASIN NOIBO — Workforce V2 final validation / review / publish V1
-- Phase 8: controlled review and atomic publication into work_schedules.
-- Node scheduler remains the generation engine; Supabase is the final gate.

create or replace function public.validate_schedule_generation_v1(p_generation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run record;
  v_role text := public.current_user_role();
  v_store_ok boolean;
  v_violations jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_count integer;
  r record;
  a record;
  c record;
  sk record;
  mentor_ok boolean;
  cover_count integer;
  min_cover integer;
  max_cover integer;
  cur_hours numeric;
  prev_end time;
  rest_hours numeric;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_run from public.schedule_generation_runs where id = p_generation_id for update;
  if not found then raise exception 'GENERATION_NOT_FOUND'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if v_role = 'STORE_MANAGER' and not public.can_access_store(v_run.store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;
  if v_run.week_end <> v_run.week_start + 6 then
    v_violations := v_violations || jsonb_build_object('code','INVALID_GENERATION_WEEK','message','Generation week must be Monday-Sunday.');
  end if;

  -- Assignment integrity + employee hard constraints.
  for a in
    select sga.*, p.status as profile_status, p.access_scope
      from public.schedule_generation_assignments sga
      join public.profiles p on p.id = sga.user_id
     where sga.generation_id = p_generation_id
  loop
    if a.profile_status <> 'ACTIVE' then
      v_violations := v_violations || jsonb_build_object('code','EMPLOYEE_INACTIVE','user_id',a.user_id,'work_date',a.work_date);
    end if;
    if a.store_id <> v_run.store_id then
      v_violations := v_violations || jsonb_build_object('code','STORE_NOT_ALLOWED','user_id',a.user_id,'store_id',a.store_id);
    end if;
    if not public.can_access_store(a.store_id) and v_role <> 'OWNER' then
      v_violations := v_violations || jsonb_build_object('code','STORE_NOT_ALLOWED','user_id',a.user_id,'store_id',a.store_id);
    end if;
    if a.work_date < v_run.week_start or a.work_date > v_run.week_end or a.end_time <= a.start_time then
      v_violations := v_violations || jsonb_build_object('code','ASSIGNMENT_OUTSIDE_GENERATION','user_id',a.user_id,'work_date',a.work_date);
    end if;

    -- Availability: full containment in AVAILABLE/PREFERRED and no UNAVAILABLE overlap.
    if not exists (
      select 1 from public.employee_availability ea
       where ea.user_id = a.user_id and ea.work_date = a.work_date
         and ea.availability_type in ('AVAILABLE','PREFERRED')
         and ea.start_time <= a.start_time and ea.end_time >= a.end_time
    ) then
      v_violations := v_violations || jsonb_build_object('code','NOT_AVAILABLE','user_id',a.user_id,'work_date',a.work_date,'start_time',a.start_time,'end_time',a.end_time);
    end if;
    if exists (
      select 1 from public.employee_availability ea
       where ea.user_id = a.user_id and ea.work_date = a.work_date
         and ea.availability_type = 'UNAVAILABLE'
         and ea.start_time < a.end_time and a.start_time < ea.end_time
    ) then
      v_violations := v_violations || jsonb_build_object('code','UNAVAILABLE_OVERLAP','user_id',a.user_id,'work_date',a.work_date);
    end if;

    -- Store eligibility: explicit allow-list if present, otherwise profile access_scope.
    select * into c from public.employee_constraints where user_id = a.user_id;
    if found and coalesce(array_length(c.allowed_store_ids,1),0) > 0 then
      if not (a.store_id = any(c.allowed_store_ids)) then
        v_violations := v_violations || jsonb_build_object('code','STORE_NOT_ALLOWED','user_id',a.user_id,'store_id',a.store_id);
      end if;
    elsif found and coalesce(nullif(trim(c.preferred_store_id::text),''),'') <> '' then
      null; -- preferred store never grants eligibility; fallback remains profile scope.
    elsif coalesce(trim(a.access_scope),'') <> '' and upper(trim(a.access_scope)) <> 'ALL' then
      if not exists (
        select 1 from public.stores s
         where s.id = a.store_id
           and position(upper(s.code) in upper(replace(replace(a.access_scope,',',';'),' ',''))) > 0
      ) then
        v_violations := v_violations || jsonb_build_object('code','STORE_NOT_ALLOWED','user_id',a.user_id,'store_id',a.store_id);
      end if;
    elsif coalesce(trim(a.access_scope),'') = '' then
      v_violations := v_violations || jsonb_build_object('code','STORE_NOT_ALLOWED','user_id',a.user_id,'store_id',a.store_id);
    end if;

    -- Skill requirement when assignment is skill-specific.
    if a.skill_code is not null then
      select * into sk from public.employee_skills es
       where es.user_id = a.user_id and es.skill_code = a.skill_code and es.status = 'ACTIVE';
      if not found or sk.level < a.skill_level then
        v_violations := v_violations || jsonb_build_object('code','SKILL_NOT_QUALIFIED','user_id',a.user_id,'skill_code',a.skill_code,'required_level',a.skill_level);
      end if;
    end if;

    -- No overlap in generation draft.
    if exists (
      select 1 from public.schedule_generation_assignments x
       where x.generation_id = p_generation_id and x.user_id = a.user_id and x.id <> a.id
         and x.work_date = a.work_date and x.start_time < a.end_time and a.start_time < x.end_time
    ) then
      v_violations := v_violations || jsonb_build_object('code','EMPLOYEE_ASSIGNMENT_OVERLAP','user_id',a.user_id,'work_date',a.work_date);
    end if;
    -- No overlap with official schedule rows.
    if exists (
      select 1 from public.work_schedules ws
       where ws.user_id = a.user_id and ws.work_date = a.work_date and ws.status in ('PENDING','APPROVED')
         and ws.start_time < a.end_time and a.start_time < ws.end_time
    ) then
      v_violations := v_violations || jsonb_build_object('code','EMPLOYEE_ASSIGNMENT_OVERLAP','user_id',a.user_id,'work_date',a.work_date,'source','OFFICIAL');
    end if;

    if found and c.max_daily_hours > 0 then
      select coalesce(sum(extract(epoch from (x.end_time-x.start_time))/3600.0),0) into cur_hours
        from public.schedule_generation_assignments x
       where x.generation_id = p_generation_id and x.user_id = a.user_id and x.work_date = a.work_date;
      if cur_hours > c.max_daily_hours then
        v_violations := v_violations || jsonb_build_object('code','DAILY_HOURS_LIMIT','user_id',a.user_id,'work_date',a.work_date,'hours',cur_hours,'limit',c.max_daily_hours);
      end if;
    end if;
    if found and c.max_weekly_hours > 0 then
      select coalesce(sum(extract(epoch from (x.end_time-x.start_time))/3600.0),0) into cur_hours
        from public.schedule_generation_assignments x
       where x.generation_id = p_generation_id and x.user_id = a.user_id;
      if cur_hours > c.max_weekly_hours then
        v_violations := v_violations || jsonb_build_object('code','WEEKLY_HOURS_LIMIT','user_id',a.user_id,'hours',cur_hours,'limit',c.max_weekly_hours);
      end if;
    end if;

    if found and c.min_rest_hours > 0 then
      select max((extract(epoch from (a.start_time - x.end_time))/3600.0)) into rest_hours
        from public.schedule_generation_assignments x
       where x.generation_id = p_generation_id and x.user_id = a.user_id and x.work_date = a.work_date
         and x.end_time <= a.start_time;
      if rest_hours is not null and rest_hours < c.min_rest_hours then
        v_violations := v_violations || jsonb_build_object('code','MIN_REST_NOT_MET','user_id',a.user_id,'work_date',a.work_date,'rest_hours',rest_hours,'minimum',c.min_rest_hours);
      end if;
    end if;

    -- Mentor-required assignment must have a concurrent compatible mentor.
    if found and c.mentor_required then
      mentor_ok := false;
      if a.skill_code is not null then
        select exists (
          select 1
            from public.schedule_generation_assignments m
            join public.employee_skills ms on ms.user_id=m.user_id and ms.skill_code=a.skill_code and ms.status='ACTIVE'
           where m.generation_id=p_generation_id and m.user_id<>a.user_id and m.store_id=a.store_id
             and m.work_date=a.work_date and m.start_time < a.end_time and a.start_time < m.end_time
             and ms.level >= a.skill_level and ms.can_mentor=true
        ) into mentor_ok;
      end if;
      if not mentor_ok then
        v_violations := v_violations || jsonb_build_object('code','MENTOR_REQUIRED','user_id',a.user_id,'work_date',a.work_date,'skill_code',a.skill_code);
      end if;
    end if;
  end loop;

  -- Staffing coverage validation over each requirement's boundary intervals.
  for r in
    select * from public.staffing_requirements sr
     where sr.store_id = v_run.store_id and sr.work_date between v_run.week_start and v_run.week_end and sr.status='ACTIVE'
  loop
    for a in (
      select r.start_time as t union select r.end_time
      union select sga.start_time from public.schedule_generation_assignments sga
       where sga.generation_id=p_generation_id and sga.store_id=r.store_id and sga.work_date=r.work_date
         and sga.start_time < r.end_time and r.start_time < sga.end_time
      union select sga.end_time from public.schedule_generation_assignments sga
       where sga.generation_id=p_generation_id and sga.store_id=r.store_id and sga.work_date=r.work_date
         and sga.start_time < r.end_time and r.start_time < sga.end_time
    )
    loop
      declare
        v_next time;
        v_generic integer;
        v_skill integer;
      begin
        select min(t) into v_next from (
          select r.start_time as t union select r.end_time
          union select sga.start_time from public.schedule_generation_assignments sga where sga.generation_id=p_generation_id and sga.store_id=r.store_id and sga.work_date=r.work_date and sga.start_time < r.end_time and r.start_time < sga.end_time
          union select sga.end_time from public.schedule_generation_assignments sga where sga.generation_id=p_generation_id and sga.store_id=r.store_id and sga.work_date=r.work_date and sga.start_time < r.end_time and r.start_time < sga.end_time
        ) q where t > a.t;
        if v_next is not null then
          select count(distinct sga.user_id) into v_generic
            from public.schedule_generation_assignments sga
           where sga.generation_id=p_generation_id and sga.store_id=r.store_id and sga.work_date=r.work_date
             and sga.start_time <= a.t and sga.end_time >= v_next;
          if r.skill_code is null then
            if v_generic < r.minimum_headcount then
              v_violations := v_violations || jsonb_build_object('code','MINIMUM_COVERAGE_SHORTAGE','requirement_id',r.id,'work_date',r.work_date,'start_time',a.t,'end_time',v_next,'coverage',v_generic,'minimum',r.minimum_headcount);
            end if;
            if v_generic > r.maximum_headcount then
              v_violations := v_violations || jsonb_build_object('code','MAXIMUM_COVERAGE_EXCEEDED','requirement_id',r.id,'work_date',r.work_date,'start_time',a.t,'end_time',v_next,'coverage',v_generic,'maximum',r.maximum_headcount);
            end if;
          else
            select count(distinct sga.user_id) into v_skill
              from public.schedule_generation_assignments sga
              join public.employee_skills es on es.user_id=sga.user_id and es.skill_code=r.skill_code and es.status='ACTIVE' and es.level>=r.min_skill_level
             where sga.generation_id=p_generation_id and sga.store_id=r.store_id and sga.work_date=r.work_date
               and sga.start_time <= a.t and sga.end_time >= v_next;
            if v_skill < r.minimum_headcount then
              v_violations := v_violations || jsonb_build_object('code','MINIMUM_COVERAGE_SHORTAGE','requirement_id',r.id,'work_date',r.work_date,'start_time',a.t,'end_time',v_next,'coverage',v_skill,'minimum',r.minimum_headcount,'skill_code',r.skill_code);
            end if;
            if v_skill > r.maximum_headcount then
              v_violations := v_violations || jsonb_build_object('code','MAXIMUM_COVERAGE_EXCEEDED','requirement_id',r.id,'work_date',r.work_date,'start_time',a.t,'end_time',v_next,'coverage',v_skill,'maximum',r.maximum_headcount,'skill_code',r.skill_code);
            end if;
          end if;
        end if;
      end;
    end loop;
  end loop;

  select coalesce(jsonb_agg(distinct x), '[]'::jsonb) into v_violations from jsonb_array_elements(v_violations) x;
  if exists (
    select 1 from public.schedule_generation_assignments sga
    where sga.generation_id=p_generation_id
      and exists (select 1 from public.staffing_requirements sr where sr.store_id=sga.store_id and sr.work_date=sga.work_date and sr.start_time < sga.end_time and sga.start_time < sr.end_time and sr.status='ACTIVE')
  ) then null; end if;

  if jsonb_array_length(v_violations)=0 then
    v_count := (select count(*) from public.schedule_generation_assignments where generation_id=p_generation_id);
  else
    v_count := jsonb_array_length(v_violations);
  end if;

  return jsonb_build_object(
    'valid', jsonb_array_length(v_violations)=0,
    'generation_id', p_generation_id,
    'violations', v_violations,
    'warnings', v_warnings,
    'violation_count', jsonb_array_length(v_violations),
    'assignment_count', (select count(*) from public.schedule_generation_assignments where generation_id=p_generation_id)
  );
end;
$$;

grant execute on function public.validate_schedule_generation_v1(uuid) to authenticated;
revoke execute on function public.validate_schedule_generation_v1(uuid) from anon, public;

create or replace function public.review_schedule_generation(p_generation_id uuid, p_decision text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.schedule_generation_runs%rowtype;
  v_role text := public.current_user_role();
  v_result jsonb;
  v_decision text := upper(trim(p_decision));
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  select * into v_run from public.schedule_generation_runs where id=p_generation_id for update;
  if not found then raise exception 'GENERATION_NOT_FOUND'; end if;
  if v_role='STORE_MANAGER' and not public.can_access_store(v_run.store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;
  if v_run.status <> 'DRAFT' then raise exception 'GENERATION_NOT_DRAFT'; end if;
  if v_decision not in ('APPROVED','REJECTED') then raise exception 'INVALID_REVIEW_DECISION'; end if;
  v_result := public.validate_schedule_generation_v1(p_generation_id);
  if not coalesce((v_result->>'valid')::boolean,false) then
    raise exception 'GENERATION_VALIDATION_FAILED: %', v_result->>'violations';
  end if;
  if v_decision='APPROVED' then
    update public.schedule_generation_runs set status='REVIEWED' where id=p_generation_id;
  else
    update public.schedule_generation_runs set status='CANCELLED' where id=p_generation_id;
  end if;
  return jsonb_build_object('generation_id',p_generation_id,'status',case when v_decision='APPROVED' then 'REVIEWED' else 'CANCELLED' end,'validation',v_result);
end;
$$;

grant execute on function public.review_schedule_generation(uuid,text) to authenticated;
revoke execute on function public.review_schedule_generation(uuid,text) from anon, public;

create or replace function public.publish_schedule_generation(p_generation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.schedule_generation_runs%rowtype;
  v_role text := public.current_user_role();
  v_result jsonb;
  v_inserted integer := 0;
  a record;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;

  select * into v_run from public.schedule_generation_runs where id=p_generation_id for update;
  if not found then raise exception 'GENERATION_NOT_FOUND'; end if;
  if v_role='STORE_MANAGER' and not public.can_access_store(v_run.store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;
  if v_run.status <> 'REVIEWED' then raise exception 'GENERATION_MUST_BE_REVIEWED'; end if;

  -- Final revalidation happens under the generation row lock immediately before mutation.
  v_result := public.validate_schedule_generation_v1(p_generation_id);
  if not coalesce((v_result->>'valid')::boolean,false) then
    update public.schedule_generation_runs set status='DRAFT' where id=p_generation_id;
    raise exception 'GENERATION_REVALIDATION_FAILED: %', v_result->>'violations';
  end if;

  -- Never silently overwrite an existing official schedule. Any conflict blocks the transaction.
  if exists (
    select 1
      from public.schedule_generation_assignments a
      join public.work_schedules ws
        on ws.user_id=a.user_id and ws.store_id=a.store_id and ws.work_date=a.work_date
       and ws.status in ('PENDING','APPROVED')
       and ws.start_time < a.end_time and a.start_time < ws.end_time
     where a.generation_id=p_generation_id
  ) then
    raise exception 'OFFICIAL_SCHEDULE_CONFLICT';
  end if;

  -- Insert the reviewed draft as authoritative approved manager assignments.
  insert into public.work_schedules (
    work_date,start_time,end_time,store_id,user_id,status,approver_id,approved_at,note,origin
  )
  select a.work_date,a.start_time,a.end_time,a.store_id,a.user_id,'APPROVED',auth.uid(),now(),a.note,'MANAGER_ASSIGNED'
    from public.schedule_generation_assignments a
   where a.generation_id=p_generation_id;
  get diagnostics v_inserted = row_count;

  update public.schedule_generation_runs
     set status='PUBLISHED', published_at=now(), total_hours=coalesce((select sum(extract(epoch from (end_time-start_time))/3600.0) from public.schedule_generation_assignments where generation_id=p_generation_id),0)
   where id=p_generation_id;

  return jsonb_build_object('generation_id',p_generation_id,'status','PUBLISHED','inserted_schedule_count',v_inserted,'validation',v_result);
end;
$$;

grant execute on function public.publish_schedule_generation(uuid) to authenticated;
revoke execute on function public.publish_schedule_generation(uuid) from anon, public;

comment on function public.validate_schedule_generation_v1(uuid) is 'Final server-side hard-constraint validation for a Workforce V2 generation.';
comment on function public.review_schedule_generation(uuid,text) is 'Review a DRAFT generation after final validation; APPROVED moves to REVIEWED.';
comment on function public.publish_schedule_generation(uuid) is 'Atomically revalidates and publishes a REVIEWED generation into approved work_schedules.';
