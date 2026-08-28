# MAGASIN DEPENDENCY MAP

## Canonical production runtime
`web/index.html`
→ `web/supabase-config.js`
→ `web/app.js`
→ Supabase Auth / PostgreSQL / RPC
→ business modules

GitHub Pages `web/` is the production frontend transport. Supabase is the production backend. Apps Script, Google Sheets and `google.script.run` are retired and must not be reintroduced for new work.

## Workforce / Schedule
`web/app.js`
→ `get_my_schedule()`
→ `work_schedules`

Workforce V2:

`employee_availability`
+ `employee_skills`
+ `employee_constraints`
+ `staffing_requirements`
→ deterministic scheduler
→ `schedule_generation_runs`
→ `schedule_generation_assignments`
→ independent validation
→ manager review
→ transactional publish
→ `work_schedules`
→ attendance linkage

Canonical semantics:
- `docs/architecture/MAGASIN_WORKFORCE_ARCHITECTURE_V2.md`
- `docs/architecture/MAGASIN_SCHEDULER_RULES_V1.md`

## Attendance
`web/app.js`
→ `get_my_attendance()`
→ `attendance`
→ official `work_schedules` for planning linkage

Historical attendance must not be silently rewritten by later schedule changes.

## Shift swap
`web/app.js`
→ `get_my_shift_swaps()`
→ `shift_swaps`

Manager approval and schedule reconciliation remain later work.

## Management
`web/app.js`
→ `profiles`
→ `stores`
→ `work_schedules`
→ Workforce V2 RPCs

## KPI
`kpi_records`

## Inventory
Inventory schema/operations are intentionally separate from Workforce V2.

## Printer
`web/app.js`
→ future durable `print_jobs`
→ local `print-agent/`
→ LAN
→ HPRT TL31E

## Database migration rule
All database changes are represented by SQL migrations under `supabase/migrations/`.

`main` is the repository source of truth. Feature work uses a reviewable branch before merge.
