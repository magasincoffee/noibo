-- Phase 10 corrective migration: expose authoritative approved schedule IDs for Shift Swap UI.
create or replace function public.list_my_approved_schedules_v1()
returns table(
  schedule_id uuid,
  work_date date,
  start_time time,
  end_time time,
  store_id uuid,
  store_code text,
  store_name text
)
language sql
security definer
stable
set search_path=public
as $$
  select ws.id, ws.work_date, ws.start_time, ws.end_time,
         ws.store_id, s.code, s.name
    from public.work_schedules ws
    left join public.stores s on s.id=ws.store_id
   where ws.user_id=auth.uid()
     and ws.status='APPROVED'
   order by ws.work_date, ws.start_time, ws.id;
$$;

grant execute on function public.list_my_approved_schedules_v1() to authenticated;
revoke all on function public.list_my_approved_schedules_v1() from public,anon;
