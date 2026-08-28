-- MAGASIN NOIBO — Workforce V2 final validation / review / publish V1.1
-- Corrective follow-up to Phase 8 V1: deterministic validation, cross-day rest,
-- explicit FAILED->DRAFT publish behavior, and safer transactional publication.

create or replace function public.validate_schedule_generation_v1(p_generation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.schedule_generation_runs%rowtype;
  v_role text := public.current_user_role();
  v_violations jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  a record;
  b record;
  r record;
  c public.employee_constraints%rowtype;
  sk public.employee_skills%rowtype;
  c_exists boolean;
  skill_exists boolean;
  mentor_ok boolean;
  allowed boolean;
  prev_end_ts timestamp;
  cur_start_ts timestamp;
  rest_hours numeric;
  daily_hours numeric;
  weekly_hours numeric;
  next_t time;
  generic_cover integer;
  skill_cover integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_run from public.schedule_generation_runs where id=p_generation_id for update;
  if not found then raise exception 'GENERATION_NOT_FOUND'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if v_role='STORE_MANAGER' and not public.can_access_store(v_run.store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;

  if extract(isodow from v_run.week_start) <> 1 or v_run.week_end <> v_run.week_start + 6 then
    v_violations := v_violations || jsonb_build_object('code','INVALID_GENERATION_WEEK');
  end if;

  for a in
    select sga.*, p.status as profile_status, p.access_scope
      from public.schedule_generation_assignments sga
      join public.profiles p on p.id=sga.user_id
     where sga.generation_id=p_generation_id
     order by sga.work_date,sga.start_time,sga.store_id,sga.user_id,sga.id
  loop
    if a.profile_status <> 'ACTIVE' then
      v_violations := v_violations || jsonb_build_object('code','EMPLOYEE_INACTIVE','user_id',a.user_id,'work_date',a.work_date);
    end if;
    if a.work_date < v_run.week_start or a.work_date > v_run.week_end or a.end_time <= a.start_time then
      v_violations := v_violations || jsonb_build_object('code','ASSIGNMENT_OUTSIDE_GENERATION','user_id',a.user_id,'work_date',a.work_date);
    end if;
    if a.store_id <> v_run.store_id then
      v_violations := v_violations || jsonb_build_object('code','STORE_NOT_ALLOWED','user_id',a.user_id,'store_id',a.store_id);
    end if;

    select * into c from public.employee_constraints where user_id=a.user_id;
    c_exists := found;
    if c_exists and coalesce(array_length(c.allowed_store_ids,1),0) > 0 then
      allowed := a.store_id = any(c.allowed_store_ids);
    else
      if coalesce(upper(trim(a.access_scope)),'')='ALL' then
        allowed := true;
      elsif coalesce(trim(a.access_scope),'')='' then
        allowed := false;
      else
        select exists(
          select 1 from public.stores s
           where s.id=a.store_id
             and position(upper(s.code) in upper(replace(replace(a.access_scope,',',';'),' ',''))) > 0
        ) into allowed;
      end if;
    end if;
    if not coalesce(allowed,false) then
      v_violations := v_violations || jsonb_build_object('code','STORE_NOT_ALLOWED','user_id',a.user_id,'store_id',a.store_id);
    end if;

    if not exists(
      select 1 from public.employee_availability ea
       where ea.user_id=a.user_id and ea.work_date=a.work_date
         and ea.availability_type in ('AVAILABLE','PREFERRED')
         and ea.start_time <= a.start_time and ea.end_time >= a.end_time
    ) then
      v_violations := v_violations || jsonb_build_object('code','NOT_AVAILABLE','user_id',a.user_id,'work_date',a.work_date,'start_time',a.start_time,'end_time',a.end_time);
    end if;
    if exists(
      select 1 from public.employee_availability ea
       where ea.user_id=a.user_id and ea.work_date=a.work_date
         and ea.availability_type='UNAVAILABLE'
         and ea.start_time < a.end_time and a.start_time < ea.end_time
    ) then
      v_violations := v_violations || jsonb_build_object('code','UNAVAILABLE_OVERLAP','user_id',a.user_id,'work_date',a.work_date);
    end if;

    if a.skill_code is not null then
      select * into sk from public.employee_skills es
       where es.user_id=a.user_id and es.skill_code=a.skill_code and es.status='ACTIVE';
      skill_exists := found;
      if not skill_exists or sk.level < a.skill_level then
        v_violations := v_violations || jsonb_build_object('code','SKILL_NOT_QUALIFIED','user_id',a.user_id,'skill_code',a.skill_code,'required_level',a.skill_level);
      end if;
    end if;

    if exists(
      select 1 from public.schedule_generation_assignments y
       where y.generation_id=p_generation_id and y.user_id=a.user_id and y.id<>a.id
         and y.work_date=a.work_date and y.start_time < a.end_time and a.start_time < y.end_time
    ) then
      v_violations := v_violations || jsonb_build_object('code','EMPLOYEE_ASSIGNMENT_OVERLAP','user_id',a.user_id,'work_date',a.work_date);
    end if;
    if exists(
      select 1 from public.work_schedules ws
       where ws.user_id=a.user_id and ws.work_date=a.work_date and ws.status in ('PENDING','APPROVED')
         and ws.start_time < a.end_time and a.start_time < ws.end_time
    ) then
      v_violations := v_violations || jsonb_build_object('code','EMPLOYEE_ASSIGNMENT_OVERLAP','user_id',a.user_id,'work_date',a.work_date,'source','OFFICIAL');
    end if;

    if c_exists and c.max_daily_hours > 0 then
      select coalesce(sum(extract(epoch from (y.end_time-y.start_time))/3600.0),0) into daily_hours
        from public.schedule_generation_assignments y
       where y.generation_id=p_generation_id and y.user_id=a.user_id and y.work_date=a.work_date;
      if daily_hours > c.max_daily_hours then
        v_violations := v_violations || jsonb_build_object('code','DAILY_HOURS_LIMIT','user_id',a.user_id,'work_date',a.work_date,'hours',daily_hours,'limit',c.max_daily_hours);
      end if;
    end if;
    if c_exists and c.max_weekly_hours > 0 then
      select coalesce(sum(extract(epoch from (y.end_time-y.start_time))/3600.0),0) into weekly_hours
        from public.schedule_generation_assignments y
       where y.generation_id=p_generation_id and y.user_id=a.user_id;
      if weekly_hours > c.max_weekly_hours then
        v_violations := v_violations || jsonb_build_object('code','WEEKLY_HOURS_LIMIT','user_id',a.user_id,'hours',weekly_hours,'limit',c.max_weekly_hours);
      end if;
    end if;
    if c_exists and c.min_rest_hours > 0 then
      cur_start_ts := a.work_date + a.start_time;
      select max(x.work_date + x.end_time) into prev_end_ts
        from public.schedule_generation_assignments x
       where x.generation_id=p_generation_id and x.user_id=a.user_id and x.id<>a.id
         and (x.work_date + x.end_time) <= cur_start_ts;
      if prev_end_ts is not null then
        rest_hours := extract(epoch from (cur_start_ts-prev_end_ts))/3600.0;
        if rest_hours < c.min_rest_hours then
          v_violations := v_violations || jsonb_build_object('code','MIN_REST_NOT_MET','user_id',a.user_id,'work_date',a.work_date,'rest_hours',rest_hours,'minimum',c.min_rest_hours);
        end if;
      end if;
    end if;

    if c_exists and c.mentor_required then
      mentor_ok := false;
      if a.skill_code is not null then
        select exists(
          select 1 from public.schedule_generation_assignments m
          join public.employee_skills ms on ms.user_id=m.user_id and ms.skill_code=a.skill_code and ms.status='ACTIVE'
          where m.generation_id=p_generation_id and m.user_id<>a.user_id and m.store_id=a.store_id
            and m.work_date=a.work_date and m.start_time<a.end_time and a.start_time<m.end_time
            and ms.level>=a.skill_level and ms.can_mentor=true
        ) into mentor_ok;
      end if;
      if not mentor_ok then
        v_violations := v_violations || jsonb_build_object('code','MENTOR_REQUIRED','user_id',a.user_id,'work_date',a.work_date,'skill_code',a.skill_code);
      end if;
    end if;
  end loop;

  for r in
    select sr.* from public.staffing_requirements sr
     where sr.store_id=v_run.store_id
       and sr.work_date between v_run.week_start and v_run.week_end
       and sr.status='ACTIVE'
     order by sr.work_date,sr.start_time,sr.id
  loop
    for b in
      select t from (
        select r.start_time as t
        union select r.end_time
        union select sga.start_time from public.schedule_generation_assignments sga
         where sga.generation_id=p_generation_id and sga.store_id=r.store_id and sga.work_date=r.work_date
           and sga.start_time<r.end_time and r.start_time<sga.end_time
        union select sga.end_time from public.schedule_generation_assignments sga
         where sga.generation_id=p_generation_id and sga.store_id=r.store_id and sga.work_date=r.work_date
           and sga.start_time<r.end_time and r.start_time<sga.end_time
      ) q order by t
    loop
      select min(t) into next_t from (
        select r.start_time as t
        union select r.end_time
        union select sga.start_time from public.schedule_generation_assignments sga
         where sga.generation_id=p_generation_id and sga.store_id=r.store_id and sga.work_date=r.work_date
           and sga.start_time<r.end_time and r.start_time<sga.end_time
        union select sga.end_time from public.schedule_generation_assignments sga
         where sga.generation_id=p_generation_id and sga.store_id=r.store_id and sga.work_date=r.work_date
           and sga.start_time<r.end_time and r.start_time<sga.end_time
      ) q where t>b.t;
      if next_t is null then continue; end if;
      if r.skill_code is null then
        select count(distinct sga.user_id) into generic_cover
          from public.schedule_generation_assignments sga
         where sga.generation_id=p_generation_id and sga.store_id=r.store_id and sga.work_date=r.work_date
           and sga.start_time<=b.t and sga.end_time>=next_t;
        if generic_cover<r.minimum_headcount then
          v_violations := v_violations || jsonb_build_object('code','MINIMUM_COVERAGE_SHORTAGE','requirement_id',r.id,'work_date',r.work_date,'start_time',b.t,'end_time',next_t,'coverage',generic_cover,'minimum',r.minimum_headcount);
        end if;
        if generic_cover>r.maximum_headcount then
          v_violations := v_violations || jsonb_build_object('code','MAXIMUM_COVERAGE_EXCEEDED','requirement_id',r.id,'work_date',r.work_date,'start_time',b.t,'end_time',next_t,'coverage',generic_cover,'maximum',r.maximum_headcount);
        end if;
        if generic_cover<r.target_headcount then
          v_warnings := v_warnings || jsonb_build_object('code','TARGET_NOT_MET','requirement_id',r.id,'work_date',r.work_date,'start_time',b.t,'end_time',next_t,'coverage',generic_cover,'target',r.target_headcount);
        end if;
      else
        select count(distinct sga.user_id) into skill_cover
          from public.schedule_generation_assignments sga
          join public.employee_skills es on es.user_id=sga.user_id and es.skill_code=r.skill_code and es.status='ACTIVE' and es.level>=r.min_skill_level
         where sga.generation_id=p_generation_id and sga.store_id=r.store_id and sga.work_date=r.work_date
           and sga.start_time<=b.t and sga.end_time>=next_t;
        if skill_cover<r.minimum_headcount then
          v_violations := v_violations || jsonb_build_object('code','MINIMUM_COVERAGE_SHORTAGE','requirement_id',r.id,'work_date',r.work_date,'start_time',b.t,'end_time',next_t,'coverage',skill_cover,'minimum',r.minimum_headcount,'skill_code',r.skill_code);
        end if;
        if skill_cover>r.maximum_headcount then
          v_violations := v_violations || jsonb_build_object('code','MAXIMUM_COVERAGE_EXCEEDED','requirement_id',r.id,'work_date',r.work_date,'start_time',b.t,'end_time',next_t,'coverage',skill_cover,'maximum',r.maximum_headcount,'skill_code',r.skill_code);
        end if;
        if skill_cover<r.target_headcount then
          v_warnings := v_warnings || jsonb_build_object('code','TARGET_NOT_MET','requirement_id',r.id,'work_date',r.work_date,'start_time',b.t,'end_time',next_t,'coverage',skill_cover,'target',r.target_headcount,'skill_code',r.skill_code);
        end if;
      end if;
    end loop;
  end loop;

  select coalesce(jsonb_agg(value order by value->>'code',value::text),'[]'::jsonb)
    into v_violations from (select distinct value from jsonb_array_elements(v_violations)) d;
  select coalesce(jsonb_agg(value order by value->>'code',value::text),'[]'::jsonb)
    into v_warnings from (select distinct value from jsonb_array_elements(v_warnings)) d;

  return jsonb_build_object(
    'valid',jsonb_array_length(v_violations)=0,
    'generation_id',p_generation_id,
    'violations',v_violations,
    'warnings',v_warnings,
    'violation_count',jsonb_array_length(v_violations),
    'warning_count',jsonb_array_length(v_warnings),
    'assignment_count',(select count(*) from public.schedule_generation_assignments where generation_id=p_generation_id)
  );
end;
$$;

grant execute on function public.validate_schedule_generation_v1(uuid) to authenticated;
revoke execute on function public.validate_schedule_generation_v1(uuid) from anon, public;

create or replace function public.review_schedule_generation(p_generation_id uuid, p_decision text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_run public.schedule_generation_runs%rowtype;
  v_role text:=public.current_user_role();
  v_result jsonb;
  v_decision text:=upper(trim(p_decision));
  v_status text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  select * into v_run from public.schedule_generation_runs where id=p_generation_id for update;
  if not found then raise exception 'GENERATION_NOT_FOUND'; end if;
  if v_role='STORE_MANAGER' and not public.can_access_store(v_run.store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;
  if v_run.status<>'DRAFT' then raise exception 'GENERATION_NOT_DRAFT'; end if;
  if v_decision not in ('APPROVED','REJECTED') then raise exception 'INVALID_REVIEW_DECISION'; end if;
  v_result:=public.validate_schedule_generation_v1(p_generation_id);
  if not coalesce((v_result->>'valid')::boolean,false) then raise exception 'GENERATION_VALIDATION_FAILED: %',v_result->>'violations'; end if;
  v_status:=case when v_decision='APPROVED' then 'REVIEWED' else 'CANCELLED' end;
  update public.schedule_generation_runs set status=v_status where id=p_generation_id and status='DRAFT';
  if not found then raise exception 'GENERATION_REVIEW_CONFLICT'; end if;
  return jsonb_build_object('generation_id',p_generation_id,'status',v_status,'validation',v_result);
end;
$$;

grant execute on function public.review_schedule_generation(uuid,text) to authenticated;
revoke execute on function public.review_schedule_generation(uuid,text) from anon, public;

create or replace function public.publish_schedule_generation(p_generation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_run public.schedule_generation_runs%rowtype;
  v_role text:=public.current_user_role();
  v_result jsonb;
  v_inserted integer:=0;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  select * into v_run from public.schedule_generation_runs where id=p_generation_id for update;
  if not found then raise exception 'GENERATION_NOT_FOUND'; end if;
  if v_role='STORE_MANAGER' and not public.can_access_store(v_run.store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;
  if v_run.status<>'REVIEWED' then raise exception 'GENERATION_MUST_BE_REVIEWED'; end if;

  v_result:=public.validate_schedule_generation_v1(p_generation_id);
  if not coalesce((v_result->>'valid')::boolean,false) then
    update public.schedule_generation_runs set status='DRAFT' where id=p_generation_id and status='REVIEWED';
    return jsonb_build_object('generation_id',p_generation_id,'status','DRAFT','published',false,'validation',v_result);
  end if;

  if exists(
    select 1 from public.schedule_generation_assignments a
    join public.work_schedules ws on ws.user_id=a.user_id and ws.work_date=a.work_date
      and ws.status in ('PENDING','APPROVED')
      and ws.start_time<a.end_time and a.start_time<ws.end_time
    where a.generation_id=p_generation_id
  ) then
    update public.schedule_generation_runs set status='DRAFT' where id=p_generation_id and status='REVIEWED';
    return jsonb_build_object('generation_id',p_generation_id,'status','DRAFT','published',false,'error_code','OFFICIAL_SCHEDULE_CONFLICT');
  end if;

  insert into public.work_schedules(work_date,start_time,end_time,store_id,user_id,status,approver_id,approved_at,note,origin)
  select a.work_date,a.start_time,a.end_time,a.store_id,a.user_id,'APPROVED',auth.uid(),now(),a.note,'MANAGER_ASSIGNED'
    from public.schedule_generation_assignments a
   where a.generation_id=p_generation_id;
  get diagnostics v_inserted=row_count;

  update public.schedule_generation_runs
     set status='PUBLISHED',published_at=now(),
         total_hours=coalesce((select sum(extract(epoch from (end_time-start_time))/3600.0) from public.schedule_generation_assignments where generation_id=p_generation_id),0)
   where id=p_generation_id and status='REVIEWED';
  if not found then raise exception 'GENERATION_PUBLISH_CONFLICT'; end if;

  return jsonb_build_object('generation_id',p_generation_id,'status','PUBLISHED','published',true,'inserted_schedule_count',v_inserted,'validation',v_result);
end;
$$;

grant execute on function public.publish_schedule_generation(uuid) to authenticated;
revoke execute on function public.publish_schedule_generation(uuid) from anon, public;

comment on function public.validate_schedule_generation_v1(uuid) is 'Final server-side hard-constraint validation for Workforce V2; returns machine-readable violations and warnings.';
comment on function public.review_schedule_generation(uuid,text) is 'Validate and move DRAFT generation to REVIEWED or CANCELLED.';
comment on function public.publish_schedule_generation(uuid) is 'Revalidate REVIEWED generation and atomically publish approved work_schedules; failed final validation/conflict returns blocked draft without partial official writes.';
