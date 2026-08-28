# MAGASIN — SYSTEM STATUS

Date: 2026-08-28

## Canonical stack

- Frontend: GitHub Pages (`web/`)
- Backend: Supabase
- Auth: Supabase Auth
- Database: Supabase PostgreSQL + RLS + RPC
- Optional printer: `print-agent/`

## Apps Script retirement

Google Apps Script, Google Sheets, Apps Script Web App, `google.script.run`, iframe bridge and GitHub→Apps Script synchronizer are retired from the active architecture.

## Workforce V2 checkpoints

```text
Phase 0  Architecture contract            READY
Phase 1  Data-model integrity              READY
Phase 2  Scheduler domain rules            READY
Phase 3  Deterministic scheduler engine   READY FOR VALIDATION GATE
Phase 4  Independent validation gate       IN PROGRESS
```

The canonical Workforce V2 contract is documented in `docs/architecture/MAGASIN_WORKFORCE_ARCHITECTURE_V2.md`; scheduler rules are in `docs/architecture/MAGASIN_SCHEDULER_RULES_V1.md`.

## Phase 4 boundary

The independent validator must re-check draft assignments and staffing coverage without trusting the scheduler's own validity flag. Hard violations are machine-readable and block publication. The validator does not publish, mutate `work_schedules`, or bypass RLS/RPC boundaries.

## Remaining work

- Complete Phase 4 validation coverage and explainability.
- Complete Workforce generation/review/publish RPC lifecycle.
- Complete Workforce V2 employee and manager/OWNER UI.
- Complete attendance write workflow and official schedule linkage.
- Complete shift-swap approval lifecycle.
- Complete all other Supabase-backed business modules.
- Add production smoke tests and runtime verification in CI/host environment.

## Printer

`print-agent/` is retained for future HPRT TL31E LAN validation. Exact printer TCP port/protocol remains unverified.

## Database reset

Live Supabase Auth users and runtime data are not destructively reset by repository changes.
