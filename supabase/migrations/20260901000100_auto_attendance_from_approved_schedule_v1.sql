-- MAGASIN NOIBO — Auto Attendance V1
-- Backfill/complete attendance from authoritative APPROVED schedules.
-- Salary periods: 1-15 and 16-end-of-month.
-- The auto action evaluates the current salary period plus the previous one,
-- but never creates attendance for a shift that has not ended yet in Asia/Ho_Chi_Minh.

create or replace function public.auto_attendance_from_approved_schedules(
  p_from_date date default null,
  p_to_date date default null
)
returns table (
  schedule_id uuid,
  work_date date,
  store_code text,
  start_time time,
  end_time time,
  action text,
  attendance_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_now_local timestamp := now() at time zone 'Asia/Ho_Chi_Minh';
  v_month_start date := date_trunc('month', v_today)::date;
  v_current_start date;
  v_current_end date;
  v_previous_start date;
  v_previous_end date;
  v_from date;
  v_to date;
  v_schedule public.work_schedules%rowtype;
  v_grade public.employee_grades%rowtype;
  v_attendance_id uuid;
  v_check_in timestamptz;
  v_check_out timestamptz;
  v_end_date date;
  v_shift_end_local timestamp;
  v_hours numeric(8,2);
  v_amount numeric(14,2);
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1
      from public.profiles p
     where p.id = auth.uid()
       and p.status = 'ACTIVE'
       and upper(coalesce(p.role, '')) in ('STAFF', 'EMPLOYEE')
  ) then
    raise exception 'EMPLOYEE_NOT_ACTIVE';
  end if;

  if extract(day from v_today) <= 15 then
    v_current_start := v_month_start;
    v_current_end := v_month_start + 14;
    v_previous_end := v_month_start - 1;
    v_previous_start := (v_month_start - interval '1 month')::date + 15;
  else
    v_current_start := v_month_start + 15;
    v_current_end := (v_month_start + interval '1 month - 1 day')::date;
    v_previous_start := v_month_start;
    v_previous_end := v_month_start + 14;
  end if;

  -- Kept for RPC compatibility. Automatic attendance intentionally uses the
  -- salary periods, not the report filter on the screen.
  v_from := v_previous_start;
  v_to := least(v_current_end, v_today);

  select * into v_grade
    from public.employee_grades
   where user_id = auth.uid()
     and status = 'ACTIVE';

  for v_schedule in
    select ws.*
      from public.work_schedules ws
     where ws.user_id = auth.uid()
       and ws.status = 'APPROVED'
       and ws.work_date between v_from and v_to
       and (
         ws.work_date < v_today
         or (
           ws.work_date = v_today
           and (
             ws.work_date
             + case when ws.end_time <= ws.start_time then 1 else 0 end
             + ws.end_time
           ) <= v_now_local
         )
       )
     order by ws.work_date, ws.start_time, ws.end_time, ws.id
     for update
  loop
    v_attendance_id := null;

    select a.id into v_attendance_id
      from public.attendance a
     where a.schedule_id = v_schedule.id
       and a.status not in ('DELETED', 'DELETED_BY_MANAGER')
     limit 1;

    if v_attendance_id is not null then
      schedule_id := v_schedule.id;
      work_date := v_schedule.work_date;
      select s.code into store_code from public.stores s where s.id = v_schedule.store_id;
      start_time := v_schedule.start_time;
      end_time := v_schedule.end_time;
      action := 'SKIPPED_ALREADY_ATTENDED';
      attendance_id := v_attendance_id;
      return next;
      continue;
    end if;

    v_check_in := (v_schedule.work_date + v_schedule.start_time)
      at time zone 'Asia/Ho_Chi_Minh';
    v_end_date := v_schedule.work_date + case
      when v_schedule.end_time <= v_schedule.start_time then 1 else 0
    end;
    v_check_out := (v_end_date + v_schedule.end_time)
      at time zone 'Asia/Ho_Chi_Minh';
    v_shift_end_local := v_end_date + v_schedule.end_time;

    if v_shift_end_local > v_now_local then
      continue;
    end if;

    v_hours := round(
      greatest(0, extract(epoch from (v_check_out - v_check_in)) / 3600.0)::numeric,
      2
    );
    v_amount := round(v_hours * coalesce(v_grade.hourly_rate, 0), 2);

    insert into public.attendance (
      work_date, user_id, store_id, schedule_id,
      check_in, check_out, status,
      late_minutes, early_minutes, note,
      grade, hourly_rate, hours_worked, amount,
      planned_start, planned_end
    ) values (
      v_schedule.work_date, auth.uid(), v_schedule.store_id, v_schedule.id,
      v_check_in, v_check_out, 'COMPLETED',
      0, 0, 'Tự động chấm công theo lịch chính thức',
      case when v_grade.user_id is not null then v_grade.grade else null end,
      case when v_grade.user_id is not null then v_grade.hourly_rate else 0 end,
      v_hours, v_amount,
      v_schedule.start_time, v_schedule.end_time
    )
    on conflict (schedule_id)
      where schedule_id is not null
        and status not in ('DELETED', 'DELETED_BY_MANAGER')
      do nothing
    returning id into v_attendance_id;

    if v_attendance_id is null then
      select a.id into v_attendance_id
        from public.attendance a
       where a.schedule_id = v_schedule.id
         and a.status not in ('DELETED', 'DELETED_BY_MANAGER')
       limit 1;
      action := 'SKIPPED_ALREADY_ATTENDED';
    else
      action := 'AUTO_COMPLETED';
    end if;

    schedule_id := v_schedule.id;
    work_date := v_schedule.work_date;
    select s.code into store_code from public.stores s where s.id = v_schedule.store_id;
    start_time := v_schedule.start_time;
    end_time := v_schedule.end_time;
    attendance_id := v_attendance_id;
    return next;
  end loop;
end;
$$;

grant execute on function public.auto_attendance_from_approved_schedules(date, date) to authenticated;
revoke execute on function public.auto_attendance_from_approved_schedules(date, date) from anon, public;

comment on function public.auto_attendance_from_approved_schedules(date, date) is
  'Automatic attendance for the authenticated employee: current salary period plus previous period, capped by current Vietnam local time; existing attendance is skipped and future/unended shifts are never created.';
