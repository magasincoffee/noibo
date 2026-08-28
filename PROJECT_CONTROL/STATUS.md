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

### Phase 0 — Architecture baseline

- Canonical Workforce V2 schedule architecture documented in `docs/architecture/MAGASIN_WORKFORCE_ARCHITECTURE_V2.md`.
- Business timezone, week boundaries, availability semantics, mentor semantics, generation lifecycle and publish boundary are defined.
- Phase 0 is documentation-only.

### Phase 1 — Data model integrity

- Workforce V2 data-integrity hardening migration prepared in `supabase/migrations/20260828001200_workforce_data_integrity_v1.sql`.
- Generation week consistency, generic-demand semantics, scheduler-oriented indexes and schema comments are defined.
- Phase 1 has no scheduler algorithm, publish workflow or UI changes.

### Phase 2 — Scheduler domain rules

- Canonical rulebook documented in `docs/architecture/MAGASIN_SCHEDULER_RULES_V1.md`.
- Hard constraints, soft objectives, deterministic ordering, coverage semantics, mentor rules and explanation codes are defined.
- Phase 2 has no scheduler engine, publish workflow or UI changes.

## Printer

`print-agent/` is retained for future HPRT TL31E LAN validation. Exact printer TCP port/protocol remains unverified.

## Remaining work

- Implement deterministic Workforce scheduler engine.
- Implement validation/explainability layer.
- Complete Workforce RPC flow.
- Complete Workforce V2 UI and review/publish workflow.
- Complete attendance write workflow and schedule linkage.
- Complete shift-swap approval lifecycle.
- Design inventory/order schema before implementation.
- Add automated tests and production smoke tests.

## Database reset

The repository has been cleaned, but live Supabase Auth users and runtime data have not been destructively deleted. A database reset requires an explicit privileged Supabase operation and must preserve the owner account needed to regain access.
