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

```text
Employee availability
+ staffing demand
+ skills / constraints
        ↓
Scheduler draft
        ↓
Manager review
        ↓
Publish official schedule
        ↓
Attendance
```

### Phase 1 — Data model integrity

Completed the first data-integrity hardening migration for Workforce V2 without changing scheduler behavior. The migration:

- enforces `week_end = week_start + 6` for a generation run;
- prevents a generic staffing requirement from carrying a meaningless skill level;
- keeps `updated_at` synchronized on generation runs;
- adds scheduler-oriented indexes for availability, active skills, constraints, staffing requirements and generation assignments;
- documents the intended V1 semantics on key workforce columns.

The deterministic scheduler engine, full review/publish RPC flow, and complete Workforce UI remain later phases.

## Printer

`print-agent/` is retained for future HPRT TL31E LAN validation. Exact printer TCP port/protocol remains unverified.

## Remaining work

- Complete all Supabase-backed business modules.
- Complete Workforce V2 UI and deterministic scheduler engine.
- Complete attendance write workflow and schedule linkage.
- Complete shift-swap approval lifecycle.
- Design inventory/order schema before implementation.
- Add automated tests and production smoke tests.

## Database reset

The repository has been cleaned, but live Supabase Auth users and runtime data have not been destructively deleted. A database reset requires an explicit privileged Supabase operation and must preserve the owner account needed to regain access.
