# MAGASIN Workforce V2 — Attendance integration V1

## Canonical relationship
`work_schedules` is the authoritative planned-work record. `attendance.schedule_id` directly references the schedule used for the attendance record.

## Employee flow
APPROVED schedule → employee selects shift → `clock_in_for_schedule()` → OPEN attendance → `clock_out_attendance()` → COMPLETED attendance.

## Snapshot semantics
At check-in, `planned_start`, `planned_end`, `grade`, and `hourly_rate` are snapshotted. Check-out calculates `late_minutes`, `early_minutes`, `hours_worked`, and `amount`.

## Guards
- Only the authenticated employee's own APPROVED schedule can be checked in.
- Business date uses `Asia/Ho_Chi_Minh`.
- One active attendance per schedule and one OPEN attendance per employee.
- No direct browser write to `work_schedules`.
- Manager correction, overtime/labor-law rules, payroll export and shift-swap mutation remain out of scope.

## Runtime verification required
- Apply migration to target Supabase.
- Verify positive check-in/check-out.
- Verify duplicate schedule attendance is blocked.
- Verify concurrent/open attendance is blocked.
- Verify late/early/hours/amount calculations.
- Verify employee cannot use another employee's schedule or non-APPROVED schedule.
