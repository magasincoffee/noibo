# Workforce V2 Phase 9 — Attendance integration

`work_schedules` is the authoritative planned-work record. `attendance.schedule_id` directly references the schedule used for actual attendance.

Employee flow: APPROVED schedule → check-in → OPEN attendance → check-out → COMPLETED attendance.

Check-in snapshots `planned_start`, `planned_end`, active grade and hourly rate. Check-out calculates late/early minutes, worked hours and amount.

Guards: authenticated employee only, APPROVED schedule only, Vietnam business date, one OPEN attendance per employee, one active attendance per schedule, no direct browser write to `work_schedules`.

Out of scope: manager correction, overtime/labor-law rules, payroll export, shift-swap mutation.

Runtime verification is required on the target Supabase project and deployed GitHub Pages site before merge.