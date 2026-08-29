-- MAGASIN Workforce V2 Phase 10 — Shift Swap integration V1
-- Requests reference authoritative APPROVED work_schedules.
-- Approval swaps schedule ownership atomically; attendance history is never rewritten.

alter table public.shift_swaps
  add column if not exists requester_schedule_id uuid references public.work_schedules(id),
  add column if not exists target_schedule_id uuid references public.work_schedules(id),
  add column if not exists target_user_id uuid references public.profiles(id);

create index if not exists idx_shift_swaps_requester_schedule
  on public.shift_swaps(requester_schedule_id, status);
create index if not exists idx_shift_swaps_target_schedule
  on public.shift_swaps(target_schedule_id, status);
create index if not exists idx_shift_swaps_store_status
  on public.shift_swaps(store_id, status, requested_at desc);
create unique index if not exists uq_shift_swaps_pending_requester_schedule
  on public.shift_swaps(requester_schedule_id)
  where status='PENDING' and requester_schedule_id is not null;
create unique index if not exists uq_shift_swaps_pending_target_schedule
  on public.shift_swaps(target_schedule_id)
  where status='PENDING' and target_schedule_id is not null;

-- Browser writes are RPC-only from Phase 10 onward.
revoke insert, update, delete on public.shift_swaps from authenticated;

-- Internal validator: intentionally not executable by browser roles.
create or replace function public.validate_shift_swap_v1(
  p_requester_schedule_id uuid,
  p_target_schedule_id uuid,
  p_requester_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_req public.work_schedules%rowtype;
  v_target public.work_schedules%rowtype;
  v_violations jsonb := '[]'::jsonb;
  v_req_daily numeric := 0;
  v_target_daily numeric := 0;
  v_req_weekly numeric := 0;
  v_target_weekly numeric := 0;
  v_req_daily_cap numeric := 0;
  v_target_daily_cap numeric := 0;
  v_req_weekly_cap numeric := 0;
  v_target_weekly_cap numeric := 0;
  v_week_start date;
begin
  select * into v_req from public.work_schedules where id=p_requester_schedule_id;
  select * into v_target from public.work_schedules where id=p_target_schedule_id;

  if v_req.id is null then
    v_violations:=v_violations||jsonb_build_object('code','REQUESTER_SCHEDULE_NOT_FOUND');
  end if;
  if v_target.id is null then
    v_violations:=v_violations||jsonb_build_object('code','TARGET_SCHEDULE_NOT_FOUND');
  end if;
  if v_req.id is null or v_target.id is null then
    return jsonb_build_object('valid',false,'violations',v_violations,'violation_count',jsonb_array_length(v_violations));
  end if;

  if v_req.user_id<>p_requester_user_id then
    v_violations:=v_violations||jsonb_build_object('code','REQUESTER_SCHEDULE_NOT_OWNED');
  end if;
  if v_req.user_id=v_target.user_id then
    v_violations:=v_violations||jsonb_build_object('code','SAME_EMPLOYEE_SWAP');
  end if;
  if v_req.status<>'APPROVED' then
    v_violations:=v_violations||jsonb_build_object('code','REQUESTER_SCHEDULE_NOT_APPROVED');
  end if;
  if v_target.status<>'APPROVED' then
    v_violations:=v_violations||jsonb_build_object('code','TARGET_SCHEDULE_NOT_APPROVED');
  end if;
  if v_req.store_id<>v_target.store_id then
    v_violations:=v_violations||jsonb_build_object('code','STORE_MISMATCH');
  end if;
  if v_req.work_date<>v_target.work_date then
    v_violations:=v_violations||jsonb_build_object('code','DATE_MISMATCH');
  end if;
  if not exists(select 1 from public.profiles where id=v_req.user_id and status='ACTIVE') then
    v_violations:=v_violations||jsonb_build_object('code','REQUESTER_INACTIVE');
  end if;
  if not exists(select 1 from public.profiles where id=v_target.user_id and status='ACTIVE') then
    v_violations:=v_violations||jsonb_build_object('code','TARGET_INACTIVE');
  end if;

  if exists(
    select 1 from public.attendance a
     where a.schedule_id in(v_req.id,v_target.id)
       and a.status not in('DELETED','DELETED_BY_MANAGER')
  ) then
    v_violations:=v_violations||jsonb_build_object('code','ATTENDANCE_ALREADY_EXISTS');
  end if;

  if not exists(
    select 1 from public.employee_availability ea
     where ea.user_id=v_req.user_id and ea.work_date=v_target.work_date
       and ea.availability_type in('AVAILABLE','PREFERRED')
       and ea.start_time<=v_target.start_time and ea.end_time>=v_target.end_time
  ) then
    v_violations:=v_violations||jsonb_build_object('code','REQUESTER_NOT_AVAILABLE_FOR_TARGET_SHIFT');
  end if;
  if exists(
    select 1 from public.employee_availability ea
     where ea.user_id=v_req.user_id and ea.work_date=v_target.work_date
       and ea.availability_type='UNAVAILABLE'
       and ea.start_time<v_target.end_time and v_target.start_time<ea.end_time
  ) then
    v_violations:=v_violations||jsonb_build_object('code','REQUESTER_UNAVAILABLE_FOR_TARGET_SHIFT');
  end if;
  if not exists(
    select 1 from public.employee_availability ea
     where ea.user_id=v_target.user_id and ea.work_date=v_req.work_date
       and ea.availability_type in('AVAILABLE','PREFERRED')
       and ea.start_time<=v_req.start_time and ea.end_time>=v_req.end_time
  ) then
    v_violations:=v_violations||jsonb_build_object('code','TARGET_NOT_AVAILABLE_FOR_REQUESTER_SHIFT');
  end if;
  if exists(
    select 1 from public.employee_availability ea
     where ea.user_id=v_target.user_id and ea.work_date=v_req.work_date
       and ea.availability_type='UNAVAILABLE'
       and ea.start_time<v_req.end_time and v_req.start_time<ea.end_time
  ) then
    v_violations:=v_violations||jsonb_build_object('code','TARGET_UNAVAILABLE_FOR_REQUESTER_SHIFT');
  end if;

  if exists(
    select 1 from public.work_schedules ws
     where ws.user_id=v_req.user_id and ws.id not in(v_req.id,v_target.id)
       and ws.status in('PENDING','APPROVED') and ws.work_date=v_req.work_date
       and ws.start_time<v_target.end_time and v_target.start_time<ws.end_time
  ) then
    v_violations:=v_violations||jsonb_build_object('code','REQUESTER_RESULTING_OVERLAP');
  end if;
  if exists(
    select 1 from public.work_schedules ws
     where ws.user_id=v_target.user_id and ws.id not in(v_req.id,v_target.id)
       and ws.status in('PENDING','APPROVED') and ws.work_date=v_target.work_date
       and ws.start_time<v_req.end_time and v_req.start_time<ws.end_time
  ) then
    v_violations:=v_violations||jsonb_build_object('code','TARGET_RESULTING_OVERLAP');
  end if;

  select coalesce(max(max_daily_hours),0), coalesce(max(max_weekly_hours),0)
    into v_req_daily_cap,v_req_weekly_cap
    from public.employee_constraints where user_id=v_req.user_id and status='ACTIVE';
  select coalesce(max(max_daily_hours),0), coalesce(max(max_weekly_hours),0)
    into v_target_daily_cap,v_target_weekly_cap
    from public.employee_constraints where user_id=v_target.user_id and status='ACTIVE';

  select coalesce(sum(extract(epoch from(ws.end_time-ws.start_time))/3600.0),0)
    into v_req_daily
    from public.work_schedules ws
   where ws.user_id=v_req.user_id and ws.work_date=v_req.work_date
     and ws.status in('PENDING','APPROVED') and ws.id<>v_req.id;
  v_req_daily:=v_req_daily+extract(epoch from(v_target.end_time-v_target.start_time))/3600.0;

  select coalesce(sum(extract(epoch from(ws.end_time-ws.start_time))/3600.0),0)
    into v_target_daily
    from public.work_schedules ws
   where ws.user_id=v_target.user_id and ws.work_date=v_target.work_date
     and ws.status in('PENDING','APPROVED') and ws.id<>v_target.id;
  v_target_daily:=v_target_daily+extract(epoch from(v_req.end_time-v_req.start_time))/3600.0;

  v_week_start:=v_req.work_date-(extract(isodow from v_req.work_date)::integer-1);
  select coalesce(sum(extract(epoch from(ws.end_time-ws.start_time))/3600.0),0)
    into v_req_weekly
    from public.work_schedules ws
   where ws.user_id=v_req.user_id and ws.work_date between v_week_start and v_week_start+6
     and ws.status in('PENDING','APPROVED') and ws.id<>v_req.id;
  v_req_weekly:=v_req_weekly+extract(epoch from(v_target.end_time-v_target.start_time))/3600.0;

  select coalesce(sum(extract(epoch from(ws.end_time-ws.start_time))/3600.0),0)
    into v_target_weekly
    from public.work_schedules ws
   where ws.user_id=v_target.user_id and ws.work_date between v_week_start and v_week_start+6
     and ws.status in('PENDING','APPROVED') and ws.id<>v_target.id;
  v_target_weekly:=v_target_weekly+extract(epoch from(v_req.end_time-v_req.start_time))/3600.0;

  if v_req_daily_cap>0 and v_req_daily>v_req_daily_cap then
    v_violations:=v_violations||jsonb_build_object('code','REQUESTER_DAILY_HOURS_LIMIT','hours',v_req_daily,'limit',v_req_daily_cap);
  end if;
  if v_target_daily_cap>0 and v_target_daily>v_target_daily_cap then
    v_violations:=v_violations||jsonb_build_object('code','TARGET_DAILY_HOURS_LIMIT','hours',v_target_daily,'limit',v_target_daily_cap);
  end if;
  if v_req_weekly_cap>0 and v_req_weekly>v_req_weekly_cap then
    v_violations:=v_violations||jsonb_build_object('code','REQUESTER_WEEKLY_HOURS_LIMIT','hours',v_req_weekly,'limit',v_req_weekly_cap);
  end if;
  if v_target_weekly_cap>0 and v_target_weekly>v_target_weekly_cap then
    v_violations:=v_violations||jsonb_build_object('code','TARGET_WEEKLY_HOURS_LIMIT','hours',v_target_weekly,'limit',v_target_weekly_cap);
  end if;

  return jsonb_build_object('valid',jsonb_array_length(v_violations)=0,'violations',v_violations,'violation_count',jsonb_array_length(v_violations));
end;
$$;
revoke all on function public.validate_shift_swap_v1(uuid,uuid,uuid) from public,anon,authenticated;

create or replace function public.submit_shift_swap_request(
  p_requester_schedule_id uuid,
  p_target_schedule_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_req public.work_schedules%rowtype;
  v_target public.work_schedules%rowtype;
  v_validation jsonb;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'REASON_REQUIRED'; end if;
  select * into v_req from public.work_schedules where id=p_requester_schedule_id;
  if v_req.id is null or v_req.user_id<>auth.uid() then raise exception 'REQUESTER_SCHEDULE_NOT_OWNED'; end if;
  select * into v_target from public.work_schedules where id=p_target_schedule_id;
  if v_target.id is null then raise exception 'TARGET_SCHEDULE_NOT_FOUND'; end if;
  if p_requester_schedule_id=p_target_schedule_id then raise exception 'SAME_SCHEDULE_SWAP'; end if;
  v_validation:=public.validate_shift_swap_v1(p_requester_schedule_id,p_target_schedule_id,auth.uid());
  if not coalesce((v_validation->>'valid')::boolean,false) then
    raise exception 'SHIFT_SWAP_VALIDATION_FAILED: %',v_validation->'violations';
  end if;
  if exists(
    select 1 from public.shift_swaps
     where status='PENDING'
       and (requester_schedule_id in(p_requester_schedule_id,p_target_schedule_id)
         or target_schedule_id in(p_requester_schedule_id,p_target_schedule_id))
  ) then raise exception 'SHIFT_SWAP_ALREADY_PENDING'; end if;
  insert into public.shift_swaps(
    requester_id,current_shift,requested_shift,store_id,reason,status,
    requester_schedule_id,target_schedule_id,target_user_id
  ) values(
    auth.uid(),
    to_char(v_req.work_date,'YYYY-MM-DD')||' '||to_char(v_req.start_time,'HH24:MI')||'-'||to_char(v_req.end_time,'HH24:MI'),
    to_char(v_target.work_date,'YYYY-MM-DD')||' '||to_char(v_target.start_time,'HH24:MI')||'-'||to_char(v_target.end_time,'HH24:MI'),
    v_req.store_id,p_reason,'PENDING',p_requester_schedule_id,p_target_schedule_id,v_target.user_id
  ) returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.submit_shift_swap_request(uuid,uuid,text) to authenticated;

create or replace function public.list_shift_swap_candidates_v1(p_requester_schedule_id uuid)
returns table(
  schedule_id uuid,user_id uuid,user_name text,work_date date,start_time time,end_time time,
  store_id uuid,store_code text,store_name text
)
language sql
security definer
stable
set search_path=public
as $$
  select ws.id,ws.user_id,p.full_name,ws.work_date,ws.start_time,ws.end_time,ws.store_id,s.code,s.name
    from public.work_schedules ws
    join public.profiles p on p.id=ws.user_id
    join public.stores s on s.id=ws.store_id
   where ws.status='APPROVED' and p.status='ACTIVE' and ws.user_id<>auth.uid()
     and exists(
       select 1 from public.work_schedules mine
        where mine.id=p_requester_schedule_id and mine.user_id=auth.uid()
          and mine.status='APPROVED' and mine.store_id=ws.store_id and mine.work_date=ws.work_date
     )
     and not exists(select 1 from public.attendance a where a.schedule_id=ws.id and a.status not in('DELETED','DELETED_BY_MANAGER'))
     and not exists(select 1 from public.shift_swaps ss where ss.status='PENDING' and (ss.requester_schedule_id=ws.id or ss.target_schedule_id=ws.id))
   order by ws.start_time,ws.user_id,ws.id;
$$;
grant execute on function public.list_shift_swap_candidates_v1(uuid) to authenticated;

create or replace function public.list_my_shift_swaps_v2()
returns table(
  id uuid,status text,reason text,requested_at timestamptz,
  store_code text,store_name text,requester_schedule_id uuid,target_schedule_id uuid,target_user_id uuid,
  requester_date date,requester_start time,requester_end time,target_date date,target_start time,target_end time,
  target_user_name text,approver_id uuid,approved_at timestamptz,note text
)
language sql
security definer
stable
set search_path=public
as $$
  select ss.id,ss.status,ss.reason,ss.requested_at,s.code,s.name,
         ss.requester_schedule_id,ss.target_schedule_id,ss.target_user_id,
         r.work_date,r.start_time,r.end_time,t.work_date,t.start_time,t.end_time,
         p.full_name,ss.approver_id,ss.approved_at,ss.note
    from public.shift_swaps ss
    left join public.stores s on s.id=ss.store_id
    left join public.work_schedules r on r.id=ss.requester_schedule_id
    left join public.work_schedules t on t.id=ss.target_schedule_id
    left join public.profiles p on p.id=ss.target_user_id
   where ss.requester_id=auth.uid()
   order by ss.requested_at desc;
$$;
grant execute on function public.list_my_shift_swaps_v2() to authenticated;

create or replace function public.list_shift_swap_requests_v1(p_store_id uuid default null,p_status text default 'PENDING')
returns table(
  id uuid,status text,reason text,requested_at timestamptz,
  store_id uuid,store_code text,store_name text,requester_id uuid,requester_name text,
  requester_schedule_id uuid,target_schedule_id uuid,target_user_id uuid,target_user_name text,
  requester_date date,requester_start time,requester_end time,target_date date,target_start time,target_end time
)
language sql
security definer
stable
set search_path=public
as $$
  select ss.id,ss.status,ss.reason,ss.requested_at,s.id,s.code,s.name,
         ss.requester_id,rp.full_name,ss.requester_schedule_id,ss.target_schedule_id,ss.target_user_id,tp.full_name,
         r.work_date,r.start_time,r.end_time,t.work_date,t.start_time,t.end_time
    from public.shift_swaps ss
    join public.stores s on s.id=ss.store_id
    left join public.profiles rp on rp.id=ss.requester_id
    left join public.profiles tp on tp.id=ss.target_user_id
    left join public.work_schedules r on r.id=ss.requester_schedule_id
    left join public.work_schedules t on t.id=ss.target_schedule_id
   where public.current_user_role() in('OWNER','STORE_MANAGER')
     and (p_store_id is null or ss.store_id=p_store_id)
     and (p_status is null or ss.status=upper(p_status))
     and (public.current_user_role()='OWNER' or public.can_access_store(ss.store_id))
   order by ss.requested_at desc;
$$;
grant execute on function public.list_shift_swap_requests_v1(uuid,text) to authenticated;

create or replace function public.approve_shift_swap(p_swap_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_swap public.shift_swaps%rowtype;
  v_req public.work_schedules%rowtype;
  v_target public.work_schedules%rowtype;
  v_validation jsonb;
  v_tmp uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if public.current_user_role() not in('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  select * into v_swap from public.shift_swaps where id=p_swap_id for update;
  if not found then raise exception 'SHIFT_SWAP_NOT_FOUND'; end if;
  if v_swap.status<>'PENDING' then raise exception 'SHIFT_SWAP_NOT_PENDING'; end if;
  if public.current_user_role()='STORE_MANAGER' and not public.can_access_store(v_swap.store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;
  if v_swap.requester_schedule_id is null or v_swap.target_schedule_id is null then raise exception 'SHIFT_SWAP_LEGACY_REQUEST'; end if;

  if v_swap.requester_schedule_id::text < v_swap.target_schedule_id::text then
    select * into v_req from public.work_schedules where id=v_swap.requester_schedule_id for update;
    select * into v_target from public.work_schedules where id=v_swap.target_schedule_id for update;
  else
    select * into v_target from public.work_schedules where id=v_swap.target_schedule_id for update;
    select * into v_req from public.work_schedules where id=v_swap.requester_schedule_id for update;
  end if;
  if v_req.id is null or v_target.id is null then raise exception 'SCHEDULE_NOT_FOUND'; end if;
  if v_req.user_id<>v_swap.requester_id then raise exception 'REQUESTER_OWNERSHIP_CHANGED'; end if;
  if v_target.user_id<>v_swap.target_user_id then raise exception 'TARGET_OWNERSHIP_CHANGED'; end if;

  v_validation:=public.validate_shift_swap_v1(v_swap.requester_schedule_id,v_swap.target_schedule_id,v_swap.requester_id);
  if not coalesce((v_validation->>'valid')::boolean,false) then
    raise exception 'SHIFT_SWAP_REVALIDATION_FAILED: %',v_validation->'violations';
  end if;

  v_tmp:=v_req.user_id;
  update public.work_schedules
     set user_id=v_target.user_id,
         note=concat_ws(E'\n',nullif(note,''),'Shift swap approved #'||p_swap_id::text)
   where id=v_req.id;
  update public.work_schedules
     set user_id=v_tmp,
         note=concat_ws(E'\n',nullif(note,''),'Shift swap approved #'||p_swap_id::text)
   where id=v_target.id;

  update public.shift_swaps
     set status='APPROVED',approver_id=auth.uid(),approved_at=now(),note=concat_ws(E'\n',nullif(note,''),'Approved')
   where id=p_swap_id and status='PENDING';
  if not found then raise exception 'SHIFT_SWAP_APPROVAL_CONFLICT'; end if;

  return jsonb_build_object('id',p_swap_id,'status','APPROVED','swapped',true,
    'requester_schedule_id',v_swap.requester_schedule_id,'target_schedule_id',v_swap.target_schedule_id);
end;
$$;
grant execute on function public.approve_shift_swap(uuid) to authenticated;

create or replace function public.reject_shift_swap(p_swap_id uuid,p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_swap public.shift_swaps%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if public.current_user_role() not in('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  select * into v_swap from public.shift_swaps where id=p_swap_id for update;
  if not found then raise exception 'SHIFT_SWAP_NOT_FOUND'; end if;
  if v_swap.status<>'PENDING' then raise exception 'SHIFT_SWAP_NOT_PENDING'; end if;
  if public.current_user_role()='STORE_MANAGER' and not public.can_access_store(v_swap.store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;
  update public.shift_swaps
     set status='REJECTED',approver_id=auth.uid(),approved_at=now(),note=concat_ws(E'\n',nullif(note,''),nullif(p_note,''))
   where id=p_swap_id and status='PENDING';
  if not found then raise exception 'SHIFT_SWAP_REJECTION_CONFLICT'; end if;
  return jsonb_build_object('id',p_swap_id,'status','REJECTED');
end;
$$;
grant execute on function public.reject_shift_swap(uuid,text) to authenticated;

create or replace function public.cancel_shift_swap(p_swap_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_swap public.shift_swaps%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_swap from public.shift_swaps where id=p_swap_id for update;
  if not found then raise exception 'SHIFT_SWAP_NOT_FOUND'; end if;
  if v_swap.status<>'PENDING' then raise exception 'SHIFT_SWAP_NOT_PENDING'; end if;
  if v_swap.requester_id<>auth.uid() then raise exception 'SHIFT_SWAP_NOT_OWNED'; end if;
  update public.shift_swaps set status='CANCELLED' where id=p_swap_id and status='PENDING';
  if not found then raise exception 'SHIFT_SWAP_CANCELLATION_CONFLICT'; end if;
  return jsonb_build_object('id',p_swap_id,'status','CANCELLED');
end;
$$;
grant execute on function public.cancel_shift_swap(uuid) to authenticated;

revoke all on function public.submit_shift_swap_request(uuid,uuid,text) from public,anon;
revoke all on function public.list_shift_swap_candidates_v1(uuid) from public,anon;
revoke all on function public.list_my_shift_swaps_v2() from public,anon;
revoke all on function public.list_shift_swap_requests_v1(uuid,text) from public,anon;
revoke all on function public.approve_shift_swap(uuid) from public,anon;
revoke all on function public.reject_shift_swap(uuid,text) from public,anon;
revoke all on function public.cancel_shift_swap(uuid) from public,anon;
