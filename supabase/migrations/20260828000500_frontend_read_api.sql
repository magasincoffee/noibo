-- MAGASIN Frontend Read API V1
-- Browser reads are exposed through narrowly-scoped SECURITY DEFINER functions.
-- This keeps the base tables behind RLS and avoids granting broad table access.

create or replace function public.get_my_schedule()
returns table (
  date text,
  start text,
  "end" text,
  store_id uuid,
  store_code text,
  store_name text,
  status text,
  origin text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    to_char(ws.work_date, 'YYYY-MM-DD') as date,
    to_char(ws.start_time, 'HH24:MI') as start,
    to_char(ws.end_time, 'HH24:MI') as "end",
    ws.store_id,
    s.code as store_code,
    s.name as store_name,
    ws.status,
    ws.origin
  from public.work_schedules ws
  left join public.stores s on s.id = ws.store_id
  where ws.user_id = auth.uid()
  order by ws.work_date, ws.start_time;
$$;

grant execute on function public.get_my_schedule() to authenticated;

create or replace function public.get_my_attendance()
returns table (
  date text,
  "checkIn" text,
  "checkOut" text,
  status text,
  store_id uuid,
  store_code text,
  store_name text,
  hours_worked numeric,
  amount numeric,
  late_minutes integer,
  early_minutes integer
)
language sql
security definer
stable
set search_path = public
as $$
  select
    to_char(a.work_date, 'YYYY-MM-DD') as date,
    case when a.check_in is null then '' else to_char(a.check_in at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI') end as "checkIn",
    case when a.check_out is null then '' else to_char(a.check_out at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI') end as "checkOut",
    a.status,
    a.store_id,
    s.code as store_code,
    s.name as store_name,
    a.hours_worked,
    a.amount,
    a.late_minutes,
    a.early_minutes
  from public.attendance a
  left join public.stores s on s.id = a.store_id
  where a.user_id = auth.uid()
  order by a.work_date desc, a.check_in desc nulls last;
$$;

grant execute on function public.get_my_attendance() to authenticated;

create or replace function public.get_my_shift_swaps()
returns table (
  id uuid,
  date text,
  "currentShift" text,
  "requestedShift" text,
  reason text,
  status text,
  requested_at text,
  store_code text,
  store_name text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    ss.id,
    to_char(ss.requested_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') as date,
    ss.current_shift as "currentShift",
    ss.requested_shift as "requestedShift",
    ss.reason,
    ss.status,
    to_char(ss.requested_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI') as requested_at,
    s.code as store_code,
    s.name as store_name
  from public.shift_swaps ss
  left join public.stores s on s.id = ss.store_id
  where ss.requester_id = auth.uid()
  order by ss.requested_at desc;
$$;

grant execute on function public.get_my_shift_swaps() to authenticated;
