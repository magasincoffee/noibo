# MAGASIN — SYSTEM STATUS

Date: 2026-08-28

## Canonical stack

- Frontend: GitHub Pages (`web/`)
- Backend: Supabase
- Auth: Supabase Auth
- Database: Supabase PostgreSQL + RLS + RPC
- Optional printer: `print-agent/`

## Apps Script retirement

Google Apps Script, Google Sheets, Apps Script Web App, `google.script.run`, iframe bridge and GitHub→Apps Script synchronizer are retired and removed from the active repository.

## Validated Supabase flow

- Signup creates Auth user/profile and confirmation email has been tested.
- Email confirmation has been tested.
- Password recovery email and password reset have been tested.
- Username/password login has been tested.
- PENDING account approval workflow is implemented in database schema/RPC.

## Supabase data foundation

Core tables include `profiles`, `stores`, `employee_grades`, `approval_requests`, `work_schedules`, `attendance`, `shift_swaps`, `kpi_records` and Workforce V2 tables for availability, skills, constraints, staffing demand and scheduler drafts.

## Workforce V2

The canonical Workforce V2 contract is documented in `docs/architecture/MAGASIN_WORKFORCE_ARCHITECTURE_V2.md`.

```text
Employee availability
+ staffing demand
+ skills / constraints
        ↓
Deterministic scheduler
        ↓
DRAFT generation
        ↓
Manager review
        ↓
Transactional validation + publish
        ↓
Official work_schedules
        ↓
Attendance
```

Phase 0 architecture decisions now fixed for V1:

- Business timezone is `Asia/Ho_Chi_Minh`.
- Scheduling week is Monday through Sunday.
- Multiple availability windows per employee/day are allowed.
- `UNAVAILABLE` overrides overlapping `AVAILABLE`/`PREFERRED` windows.
- `PREFERRED` is workable availability plus a soft preference.
- Availability is date-specific in V1; recurring templates are out of scope.
- Overnight shifts are out of scope in V1 because the existing schema requires `end_time > start_time`.
- Maximum daily/weekly hour limits and minimum rest are hard constraints when configured above zero.
- Store eligibility uses `allowed_store_ids` when populated, otherwise falls back to profile `access_scope`.
- Preferred store is a soft preference.
- Skill requirements are satisfied only by active matching skills at or above the required level.
- Mentor requirements are evaluated at the same store/time and by the same required skill.
- Scheduler output is always DRAFT first; automatic publication is prohibited.
- Publish must revalidate and commit the official schedule atomically.
- Deterministic tie-breaking is required; no random scheduler behavior.

Phase 0 changes are documentation-only and do not change runtime business logic.

## Printer

`print-agent/` is retained for future HPRT TL31E LAN validation. Exact printer TCP port/protocol remains unverified.

## Remaining work

- Implement Workforce V2 domain validation and deterministic scheduler engine.
- Implement Workforce generation/review/publish RPC lifecycle.
- Complete Workforce V2 employee and manager/OWNER UI.
- Complete attendance write workflow and official schedule linkage.
- Complete shift-swap approval lifecycle.
- Complete all other Supabase-backed business modules.
- Design inventory/order schema before implementation.
- Add automated tests and production smoke tests.

## Documentation consistency

`PROJECT_CONTROL/MAGASIN_DEPENDENCY_MAP.md` contained legacy Apps Script production-path descriptions. Phase 0 marks those descriptions as superseded; the canonical runtime is the Supabase-only architecture described by the README and current code.

## Database reset

The repository has been cleaned, but live Supabase Auth users and runtime data have not been destructively deleted. A database reset requires an explicit privileged Supabase operation and must preserve the owner account needed to regain access.
