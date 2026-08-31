-- MAGASIN — Official Schedule Read API V1
-- Scope: read-only official schedule for Employee and Manager.
-- Business week: Monday-Sunday, Asia/Ho_Chi_Minh.
-- Active official schedule: work_schedules.status = APPROVED.

create or replace function public.get_manager_weekly_schedule(
  p_store_id uuid default null,
  p_week_start date default null
)
returns table (
  schedule_id uuid,
  work_date date,
  start_time time,
  end_time time,
  store_id uuid,
  store_code text,
  store_name text,
  user_id uuid,
  employee_name text,
  status text,
  origin text
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_role text := public.current_user_role();
  v_week_start date := coalesce(
    p_week_start,
    ((now() at time zone 'Asia/Ho_Chi_Minh')::date
      - (extract(isodow from (now() at time zone 'Asia/Ho_Chi_Minh')::date)::integer - 1))
  );
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if extract(isodow from v_week_start) <> 1 then raise exception 'WEEK_START_MUST_BE_MONDAY'; end if;
  if p_store_id is not null and not public.can_access_store(p_store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;

  return query
  select ws.id, ws.work_date, ws.start_time, ws.end_time,
         ws.store_id, s.code, s.name, ws.user_id, p.full_name,
         ws.status, ws.origin
    from public.work_schedules ws
    join public.stores s on s.id = ws.store_id
    join public.profiles p on p.id = ws.user_id
   where ws.status = 'APPROVED'
     and ws.work_date between v_week_start and v_week_start + 6
     and public.can_access_store(ws.store_id)
     and (p_store_id is null or ws.store_id = p_store_id)
   order by ws.work_date, ws.start_time, ws.end_time,
            s.code, p.full_name, ws.id;
end;
$$;

grant execute on function public.get_manager_weekly_schedule(uuid, date) to authenticated;
revoke execute on function public.get_manager_weekly_schedule(uuid, date) from anon, public;

create or replace function public.list_my_approved_schedules_v2(
  p_week_start date default null
)
returns table (
  schedule_id uuid,
  work_date date,
  start_time time,
  end_time time,
  store_id uuid,
  store_code text,
  store_name text,
  status text,
  origin text
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_week_start date := coalesce(
    p_week_start,
    ((now() at time zone 'Asia/Ho_Chi_Minh')::date
      - (extract(isodow from (now() at time zone 'Asia/Ho_Chi_Minh')::date)::integer - 1))
  );
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if extract(isodow from v_week_start) <> 1 then raise exception 'WEEK_START_MUST_BE_MONDAY'; end if;

  return query
  select ws.id, ws.work_date, ws.start_time, ws.end_time,
         ws.store_id, s.code, s.name, ws.status, ws.origin
    from public.work_schedules ws
    join public.stores s on s.id=ws.store_id
   where ws.user_id=auth.uid()
     and ws.status='APPROVED'
     and ws.work_date between v_week_start and v_week_start + 6
   order by ws.work_date, ws.start_time, ws.end_time, ws.id;
end;
$$;

grant execute on function public.list_my_approved_schedules_v2(date) to authenticated;
revoke execute on function public.list_my_approved_schedules_v2(date) from anon, public;

comment on function public.get_manager_weekly_schedule(uuid,date)
  is 'Official schedule reader for OWNER/STORE_MANAGER; APPROVED rows only, scoped by can_access_store, Monday-Sunday.';

comment on function public.list_my_approved_schedules_v2(date)
  is 'Official employee schedule reader; APPROVED rows only, Monday-Sunday, includes authoritative schedule_id.';
