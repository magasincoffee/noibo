# MAGASIN — SYSTEM STATUS

Date: 2026-08-28

## Canonical stack

- Frontend: GitHub Pages (`web/`)
- Backend: Supabase
- Auth: Supabase Auth
- Database: Supabase PostgreSQL + RLS + RPC
- Optional printer: `print-agent/`

## Apps Script retirement

Google Apps Script, Google Sheets, Google Apps Script Web App, `google.script.run`, iframe bridge and GitHub→Apps Script synchronizer are retired from the active architecture.

## Workforce V2 checkpoints

```text
Phase 0  Architecture contract             READY
Phase 1  Data-model integrity               READY
Phase 2  Scheduler domain rules             READY
Phase 3  Deterministic scheduler engine     READY FOR VALIDATION/INTEGRATION
Phase 4  Independent validation gate        READY FOR SUPABASE INTEGRATION
Phase 5  Workforce Supabase RPC/API         READY FOR REVIEW
```

The canonical Workforce V2 contract is documented in `docs/architecture/MAGASIN_WORKFORCE_ARCHITECTURE_V2.md`; scheduler rules are in `docs/architecture/MAGASIN_SCHEDULER_RULES_V1.md`.

## Phase 5 boundary

Supabase now exposes controlled Workforce RPCs for employee availability, staffing demand and scheduler generation drafts. RPCs require authenticated callers, enforce role/store scope server-side and keep generation writes in the draft layer.

Phase 5 deliberately does not expose `REVIEWED`/`PUBLISHED` transitions and does not mutate official `work_schedules`. Final validation/revalidation and atomic publication remain later work.

## Remaining work

- Integrate the deterministic scheduler package with Supabase generation RPCs.
- Complete review/revalidation/publish lifecycle.
- Complete Workforce V2 employee and manager/OWNER UI.
- Complete attendance write workflow and official schedule linkage.
- Complete shift-swap approval lifecycle.
- Complete all other Supabase-backed business modules.
- Add automated database tests and production smoke tests.

## Printer

`print-agent/` is retained for future HPRT TL31E LAN validation. Exact printer TCP port/protocol remains unverified.

## Database reset

Live Supabase Auth users and runtime data are not destructively reset by repository changes.
