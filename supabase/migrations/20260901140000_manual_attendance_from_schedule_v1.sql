-- MAGASIN NOIBO — Manual Attendance V1
create or replace function public.manual_attendance_from_schedule(
  p_work_date date,
  p_store_code text,
  p_check_in time,
  p_check_out time
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_now_local timestamp := now() at time zone 'Asia/Ho_Chi_Minh';
  v_schedule public.work_schedules%rowtype;
  v_grade public.employee_grades%rowtype;
  v_id uuid;
  v_count integer;
  v_in_local timestamp;
  v_out_local timestamp;
  v_hours numeric(8,2);
  v_amount numeric(14,2);
  v_late integer;
  v_early integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_work_date is null or p_store_code is null or p_check_in is null or p_check_out is null then raise exception 'ATTENDANCE_FIELDS_REQUIRED'; end if;
  if p_check_out <= p_check_in then raise exception 'CHECK_OUT_MUST_BE_AFTER_CHECK_IN'; end if;
  if p_work_date > v_today then raise exception 'SCHEDULE_IN_FUTURE'; end if;

  select count(*) into v_count
  from public.work_schedules ws
  join public.stores s on s.id = ws.store_id
  where ws.user_id = auth.uid()
    and ws.status = 'APPROVED'
    and ws.work_date = p_work_date
    and upper(s.code) = upper(trim(p_store_code))
    and ws.start_time = p_check_in
    and ws.end_time = p_check_out;

  if v_count = 0 then raise exception 'APPROVED_SCHEDULE_NOT_FOUND'; end if;
  if v_count > 1 then raise exception 'APPROVED_SCHEDULE_AMBIGUOUS'; end if;

  select ws.* into v_schedule
  from public.work_schedules ws
  join public.stores s on s.id = ws.store_id
  where ws.user_id = auth.uid()
    and ws.status = 'APPROVED'
    and ws.work_date = p_work_date
    and upper(s.code) = upper(trim(p_store_code))
    and ws.start_time = p_check_in
    and ws.end_time = p_check_out
  limit 1;

  if exists (select 1 from public.attendance a where a.schedule_id = v_schedule.id and a.status not in ('DELETED','DELETED_BY_MANAGER')) then raise exception 'SCHEDULE_ALREADY_ATTENDED'; end if;
  if p_work_date = v_today and (p_work_date + p_check_out) > v_now_local then raise exception 'SHIFT_NOT_FINISHED'; end if;

  select * into v_grade from public.employee_grades where user_id = auth.uid() and status = 'ACTIVE';
  v_in_local := p_work_date + p_check_in;
  v_out_local := p_work_date + p_check_out;
  v_hours := round(greatest(0, extract(epoch from (v_out_local - v_in_local)) / 3600.0)::numeric, 2);
  v_late := greatest(0, floor(extract(epoch from (v_in_local - (p_work_date + v_schedule.start_time))) / 60))::integer;
  v_early := greatest(0, floor(extract(epoch from ((p_work_date + v_schedule.end_time) - v_out_local)) / 60))::integer;
  v_amount := round(v_hours * coalesce(v_grade.hourly_rate, 0), 2);

  insert into public.attendance (
    work_date,user_id,store_id,schedule_id,check_in,check_out,status,
    late_minutes,early_minutes,note,grade,hourly_rate,hours_worked,amount,
    planned_start,planned_end
  ) values (
    v_schedule.work_date,auth.uid(),v_schedule.store_id,v_schedule.id,
    v_in_local at time zone 'Asia/Ho_Chi_Minh',
    v_out_local at time zone 'Asia/Ho_Chi_Minh',
    'COMPLETED',v_late,v_early,'Chấm công thủ công theo lịch chính thức',
    case when v_grade.user_id is not null then v_grade.grade else null end,
    case when v_grade.user_id is not null then v_grade.hourly_rate else 0 end,
    v_hours,v_amount,v_schedule.start_time,v_schedule.end_time
  ) returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.manual_attendance_from_schedule(date,text,time,time) to authenticated;
revoke execute on function public.manual_attendance_from_schedule(date,text,time,time) from anon,public;
