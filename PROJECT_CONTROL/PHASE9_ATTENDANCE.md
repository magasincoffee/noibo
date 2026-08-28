# MAGASIN Workforce V2 — Attendance integration V1

## Canonical relationship

`work_schedules` is the authoritative planned-work record. An attendance record represents actual presence against one schedule and stores `schedule_id` as the direct foreign-key link.

## Employee flow

```text
APPROVED work_schedules
        ↓
get_my_today_schedules()
        ↓
Employee selects one shift
        ↓
clock_in_for_schedule(schedule_id)
        ↓
attendance OPEN
        ↓
clock_out_attendance(attendance_id)
        ↓
attendance COMPLETED
```

## Snapshot semantics

At check-in, the attendance row snapshots:
- work date
- store
- planned start/end
- active employee grade
- active hourly rate

Later schedule or grade changes do not rewrite those historical attendance snapshot fields.

## Calculation semantics

- `late_minutes`: local Vietnam check-in later than planned start.
- `early_minutes`: local Vietnam check-out earlier than planned end.
- `hours_worked`: actual elapsed time between `check_in` and `check_out`, rounded to two decimals.
- `amount`: `hours_worked * hourly_rate`, rounded to two decimals.

## Security boundary

The browser calls controlled authenticated RPCs. Direct self-service clock-in/out writes are not part of the client contract. The RPC verifies employee ownership of the schedule/attendance and the schedule is `APPROVED`.

## V1 exclusions

No overnight shifts, no manager correction UI, no automatic overtime/labor-law rules, no external payroll export, and no shift-swap mutation of the schedule. Those belong to later phases.
