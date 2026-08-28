# MAGASIN DEPENDENCY MAP

## Canonical production runtime
`web/index.html`
→ `web/supabase-config.js`
→ `web/app.js`
→ Supabase Auth / PostgreSQL / RPC
→ business modules

GitHub Pages `web/` is the production frontend transport. Supabase is the production backend. Google Apps Script, Google Sheets and `google.script.run` are retired and must not be reintroduced for new work.

## Frontend shell
`web/index.html`
→ authentication views
→ application shell
→ page renderers in `web/app.js`

## Authentication / session / role
`web/app.js`
→ Supabase Auth
→ `profiles`
→ `resolve_login_email()`
→ `get_my_approval_status()` / approval RPCs

Roles:
- `STAFF`
- `STORE_MANAGER`
- `INVENTORY_MANAGER`
- `OWNER`

Database RLS and controlled RPCs are the authorization boundary.

## Workforce / Schedule
`web/app.js`
→ `get_my_schedule()`
→ `work_schedules`

Workforce V2 domain:

`employee_availability`
+ `employee_skills`
+ `employee_constraints`
+ `staffing_requirements`
→ deterministic scheduler
→ `schedule_generation_runs`
→ `schedule_generation_assignments`
→ manager review
→ transactional publish
→ `work_schedules`
→ attendance linkage

Canonical schedule semantics are defined in:
`docs/architecture/MAGASIN_WORKFORCE_ARCHITECTURE_V2.md`

Phase 0 decisions include:
- Asia/Ho_Chi_Minh business timezone;
- Monday-Sunday scheduling week;
- multiple date-specific availability windows per day;
- `UNAVAILABLE` overrides overlapping available/preferred windows;
- no overnight shifts in V1;
- hard constraints for hours, rest, skills, store eligibility and conflicts;
- deterministic scheduler behavior;
- DRAFT → REVIEWED → PUBLISHED generation lifecycle;
- publish revalidation and atomic official schedule update.

## Attendance
`web/app.js`
→ `get_my_attendance()`
→ `attendance`
→ official `work_schedules` for planning linkage

Planned times are used to derive late/early and related calculations; historical attendance must not be silently rewritten by later schedule changes.

## Shift swap
`web/app.js`
→ `get_my_shift_swaps()`
→ `shift_swaps`

Current limitation: complete manager approval and schedule-reconciliation lifecycle is still pending.

## Management
`web/app.js`
→ `profiles`
→ `stores`
→ `work_schedules`
→ Workforce V2 RPCs (to be implemented)

## KPI
`kpi_records`

Current limitation: business KPI aggregation is not yet implemented.

## Inventory
Inventory schema/operations are intentionally not defined in Workforce V2. Design separately before implementation.

## Printer
`web/app.js`
→ future durable `print_jobs`
→ local `print-agent/`
→ LAN
→ HPRT TL31E

The exact TL31E raw TCP port/protocol remains unverified.

## Database migration rule
All database changes must be represented by SQL migrations under `supabase/migrations/`.

`main` is the repository source of truth. Feature work should use a branch and a reviewable change before merge.
