# MAGASIN — SYSTEM STATUS

Date: 2026-08-29

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
Phase 0  Architecture contract              READY
Phase 1  Data-model integrity               READY
Phase 2  Scheduler domain rules             READY
Phase 3  Deterministic scheduler engine     PASS
Phase 4  Independent validation gate        PASS
Phase 5  Workforce Supabase RPC/API         PASS — runtime verified
Phase 6  Employee availability + schedule UI PASS
Phase 7  Manager/OWNER demand + draft UI    PASS — runtime discovery verified
Phase 8  Review/revalidation + atomic publish PASS — runtime E2E verified
Phase 9  Schedule-linked attendance          PASS — runtime E2E verified
```

The canonical Workforce V2 contract is documented in `docs/architecture/MAGASIN_WORKFORCE_ARCHITECTURE_V2.md`; scheduler rules are in `docs/architecture/MAGASIN_SCHEDULER_RULES_V1.md`.

## Integration runtime verification

Production Supabase project `MAGASIN-NOIBO` has been runtime-verified for the core Workforce P5–P9 path without leaving test data behind.

Successful E2E transaction:

```text
create generation
→ replace assignments
→ validate generation
→ review APPROVED
→ publish
→ APPROVED/MANAGER_ASSIGNED work_schedule
→ today schedule lookup
→ clock-in
→ clock-out
→ COMPLETED attendance
→ cleanup
```

A publish conflict/revalidation scenario was also verified: an official overlapping schedule introduced after review blocks publication and returns the generation to `DRAFT`.

A real trigger/schema mismatch on `schedule_generation_runs.updated_at` was discovered during the first E2E attempt and corrected by additive migration `20260829000100_workforce_generation_updated_at_fix.sql`.

## Remaining merge gates

- Browser smoke test on deployed GitHub Pages employee/manager flows.
- Full repository CI/test execution against the integration commit.
- Reconcile Supabase migration metadata timestamps with Git migration filename/version conventions.
- Review/remediate pre-existing Supabase Security Advisor warnings where appropriate.

Do not merge `workforce-v2-integration` into `main` until all merge gates above are closed.

## Printer

`print-agent/` is retained for future HPRT TL31E LAN validation. Exact printer TCP port/protocol remains unverified.

## Database reset

Live Supabase Auth users and runtime data are not destructively reset by repository changes.
