# Workforce V2 Phase 9 — Attendance checkpoint

## Scope

Attendance is now linked directly to the authoritative approved `work_schedules` row through `attendance.schedule_id`.

## Implemented

- `attendance.schedule_id` foreign key to `work_schedules`.
- One active attendance record per schedule.
- `get_my_today_schedules()` exposes today's approved schedules and their attendance state.
- `clock_in_for_schedule(uuid)` requires the authenticated employee's own APPROVED schedule for the Vietnam business date.
- Clock-in snapshots `store_id`, planned times, grade and hourly rate.
- `clock_out_attendance(uuid)` completes the open attendance and calculates early minutes, hours worked and amount.
- `get_my_attendance_v2(date,date)` returns schedule-linked history.
- Employee Attendance UI supports today's multiple approved shifts and check-in/check-out actions.

## Guardrails

- No direct browser write to `attendance` for clock-in/out.
- No clock-in against PENDING/CANCELLED schedules.
- No second OPEN attendance for the same employee.
- No second active attendance for the same schedule.
- Deleted attendance rows do not consume the schedule uniqueness slot.
- Business-day evaluation uses `Asia/Ho_Chi_Minh`.
- Overnight shifts remain unsupported by V1.

## Runtime verification required

- Apply Phase 8 and Phase 9 migrations to the target Supabase project in order.
- Verify a normal APPROVED shift can check in and check out.
- Verify late and early minute calculations around planned times.
- Verify multiple shifts on one day can be attended independently.
- Verify PENDING/CANCELLED schedules are rejected.
- Verify duplicate/open attendance is rejected.
- Verify a non-owner employee cannot use another employee's schedule or attendance id.
- Verify the GitHub Pages UI against the deployed Supabase project.
