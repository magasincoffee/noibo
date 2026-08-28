-- MAGASIN NOIBO — Workforce V2 Phase 9
-- Link attendance records directly to authoritative APPROVED work schedules.
-- Self-service clock-in/out is exposed through authenticated RPCs only.

alter table public.attendance
  add column if not exists schedule_id uuid references public.work_schedules(id);

create index if not exists idx_attendance_schedule
  on public.attendance(schedule_id);

create unique index if not exists uq_attendance_schedule_active
  on public.attendance(schedule_id)
  where schedule_id is not null
    and status not in ('DELETED','DELETED_BY_MANAGER');

comment on column public.attendance.schedule_id is
  'Authoritative work_schedules row used for this attendance record.';

create or replace function public.get_my_today_schedules()
returns table (
  schedule_id uuid,
  work_date date,
  start_time time,
  end_time time,
  store_id uuid,
  store_code text,
  store_name text,
  schedule_status text,
  attendance_id uuid,
  attendance_status text,
  check_in timestamptz,
  check_out timestamptz,
  planned_start time,
  planned_end time,
  late_minutes integer,
  early_minutes integer,
  hours_worked numeric,
  amount numeric,
  grade text,
  hourly_rate numeric
)
language sql
security definer
stable
set search_path = public
as $$
  with business_day as (
    select (now() at time zone 'Asia/Ho_Chi_Minh')::date as d
  )
  select
    ws.id,
    ws.work_date,
    ws.start_time,
    ws.end_time,
    ws.store_id,
    s.code,
    s.name,
    ws.status,
    a.id,
    a.status,
    a.check_in,
    a.check_out,
    a.planned_start,
    a.planned_end,
    a.late_minutes,
    a.early_minutes,
    a.hours_worked,
    a.amount,
    a.grade,
    a.hourly_rate
  from public.work_schedules ws
  join public.stores s on s.id = ws.store_id
  join business_day bd on bd.d = ws.work_date
  left join public.attendance a
    on a.schedule_id = ws.id
   and a.status not in ('DELETED','DELETED_BY_MANAGER')
  where ws.user_id = auth.uid()
    and ws.status = 'APPROVED'
  order by ws.start_time, ws.end_time, ws.id;
$$;

grant execute on function public.get_my_today_schedules() to authenticated;
revoke execute on function public.get_my_today_schedules() from anon, public;

create or replace function public.clock_in_for_schedule(p_schedule_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule public.work_schedules%rowtype;
  v_grade public.employee_grades%rowtype;
  v_id uuid;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_local_check_in timestamp;
  v_planned_start timestamp;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_schedule
    from public.work_schedules
   where id = p_schedule_id
     and user_id = auth.uid()
     and status = 'APPROVED'
   for share;
  if not found then raise exception 'APPROVED_SCHEDULE_NOT_FOUND'; end if;

  if v_schedule.work_date <> v_today then
    raise exception 'SCHEDULE_NOT_TODAY';
  end if;

  if exists (
    select 1 from public.attendance a
     where a.user_id = auth.uid()
       and a.status = 'OPEN'
  ) then
    raise exception 'OPEN_ATTENDANCE_EXISTS';
  end if;

  if exists (
    select 1 from public.attendance a
     where a.schedule_id = p_schedule_id
       and a.status not in ('DELETED','DELETED_BY_MANAGER')
  ) then
    raise exception 'SCHEDULE_ALREADY_ATTENDED';
  end if;

  if not exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.status = 'ACTIVE'
  ) then
    raise exception 'EMPLOYEE_NOT_ACTIVE';
  end if;

  select * into v_grade
    from public.employee_grades
   where user_id = auth.uid()
     and status = 'ACTIVE';

  v_local_check_in := now() at time zone 'Asia/Ho_Chi_Minh';
  v_planned_start := v_schedule.work_date + v_schedule.start_time;

  insert into public.attendance (
    work_date, user_id, store_id, schedule_id,
    check_in, status, planned_start, planned_end,
    grade, hourly_rate, late_minutes, early_minutes,
    hours_worked, amount
  ) values (
    v_schedule.work_date, auth.uid(), v_schedule.store_id, v_schedule.id,
    now(), 'OPEN', v_schedule.start_time, v_schedule.end_time,
    case when found then v_grade.grade else null end,
    case when found then v_grade.hourly_rate else 0 end,
    greatest(0, floor(extract(epoch from (v_local_check_in - v_planned_start)) / 60))::integer,
    0, 0, 0
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.clock_in_for_schedule(uuid) to authenticated;
revoke execute on function public.clock_in_for_schedule(uuid) from anon, public;

create or replace function public.clock_out_attendance(p_attendance_id uuid)
returns public.attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_att public.attendance%rowtype;
  v_local_checkout timestamp;
  v_planned_end timestamp;
  v_hours numeric(8,2);
  v_amount numeric(14,2);
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_att
    from public.attendance
   where id = p_attendance_id
     and user_id = auth.uid()
     and status = 'OPEN'
   for update;
  if not found then raise exception 'OPEN_ATTENDANCE_NOT_FOUND'; end if;

  v_local_checkout := now() at time zone 'Asia/Ho_Chi_Minh';
  v_planned_end := v_att.work_date + v_att.planned_end;
  v_hours := round(greatest(0, extract(epoch from (now() - v_att.check_in)) / 3600.0)::numeric, 2);
  v_amount := round(v_hours * coalesce(v_att.hourly_rate, 0), 2);

  update public.attendance
     set check_out = now(),
         status = 'COMPLETED',
         early_minutes = greatest(0, floor(extract(epoch from (v_planned_end - v_local_checkout)) / 60))::integer,
         hours_worked = v_hours,
         amount = v_amount
   where id = v_att.id
   returning * into v_att;

  return v_att;
end;
$$;

grant execute on function public.clock_out_attendance(uuid) to authenticated;
revoke execute on function public.clock_out_attendance(uuid) from anon, public;

create or replace function public.get_my_attendance_v2(
  p_from_date date default null,
  p_to_date date default null
)
returns table (
  attendance_id uuid,
  schedule_id uuid,
  work_date date,
  store_id uuid,
  store_code text,
  store_name text,
  planned_start time,
  planned_end time,
  check_in timestamptz,
  check_out timestamptz,
  status text,
  late_minutes integer,
  early_minutes integer,
  hours_worked numeric,
  amount numeric,
  grade text,
  hourly_rate numeric
)
language sql
security definer
stable
set search_path = public
as $$
  select
    a.id, a.schedule_id, a.work_date, a.store_id,
    s.code, s.name, a.planned_start, a.planned_end,
    a.check_in, a.check_out, a.status,
    a.late_minutes, a.early_minutes, a.hours_worked,
    a.amount, a.grade, a.hourly_rate
  from public.attendance a
  join public.stores s on s.id = a.store_id
  where a.user_id = auth.uid()
    and (p_from_date is null or a.work_date >= p_from_date)
    and (p_to_date is null or a.work_date <= p_to_date)
    and a.status not in ('DELETED','DELETED_BY_MANAGER')
  order by a.work_date desc, a.check_in desc nulls last, a.id desc;
$$;

grant execute on function public.get_my_attendance_v2(date, date) to authenticated;
revoke execute on function public.get_my_attendance_v2(date, date) from anon, public;

comment on function public.clock_in_for_schedule(uuid) is
  'Start attendance only for the authenticated employee own APPROVED schedule on the Vietnam business date.';
comment on function public.clock_out_attendance(uuid) is
  'Complete an OPEN attendance and calculate duration, early minutes and amount from the linked planned schedule.';
