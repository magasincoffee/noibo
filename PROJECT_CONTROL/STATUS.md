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
Phase 0  Architecture contract                    READY
Phase 1  Data-model integrity                     READY
Phase 2  Scheduler domain rules                   READY
Phase 3  Deterministic scheduler engine           PASS
Phase 4  Independent validation gate              PASS
Phase 5  Workforce Supabase RPC/API               PASS — runtime verified
Phase 6  Employee availability + schedule UI      PASS
Phase 7  Manager/OWNER demand + draft UI          PASS — runtime verified
Phase 8  Review/revalidation + atomic publish     PASS — runtime E2E verified
Phase 9  Schedule-linked attendance               PASS — runtime E2E verified
Phase 10 Shift Swap + approval workflow            PASS — runtime E2E + browser verified
```

The canonical Workforce V2 contract is documented in `docs/architecture/MAGASIN_WORKFORCE_ARCHITECTURE_V2.md`; scheduler rules are in `docs/architecture/MAGASIN_SCHEDULER_RULES_V1.md`.

## Post-Phase-10 production audit

Production Supabase project `MAGASIN-NOIBO` is `ACTIVE_HEALTHY` on PostgreSQL 17.4+ and has been runtime-verified for Workforce P5–P10.

Phase 10 browser verification covered:

```text
STAFF approved schedule
→ candidate schedule discovery
→ shift-swap request
→ PENDING history
→ OWNER approval
→ atomic schedule ownership swap
→ APPROVED history

Password recovery link
→ reset-password view retained
→ password update succeeds
→ localized validation feedback
```

E2E test data was removed after verification. Current production test cleanup checks report zero Phase-10 test `shift_swaps`, zero `PHASE10_UI_TEST` schedules, and zero test availability rows. The two temporary STAFF accounts were returned to `PENDING`.

## Security baseline

- RLS is enabled on `profiles`, `stores`, `work_schedules`, `attendance`, `employee_availability`, and `shift_swaps`.
- Phase-10 RPCs are not executable by `anon`.
- Signed-in users have no direct INSERT/UPDATE/DELETE privilege on `work_schedules`, `attendance`, or `shift_swaps`.
- Phase-10 writes are RPC-only.

## CI / main stability

- `main` is at merge commit `823b58dd328d65d90e96555d40b38875b8b038c7` from merged Phase 10.
- Workforce V2 CI passed on post-merge `main`.
- The merge commit is GitHub-verified.
- GitHub ruleset `Protect main` is ACTIVE and targets `main`.
- `main` requires pull requests, 1 approving review, the three Workforce V2 CI job checks, and blocks force pushes/deletions.
- Bypass list is empty.

## Migration history finding

Production contains 23 entries in `supabase_migrations.schema_migrations`, while the repository currently contains 20 migration files. Later Workforce migration timestamps do not map 1:1 to the production ledger versions.

This is treated as **migration-history drift**, not confirmed schema drift. The live schema and runtime behavior were verified. Do not manually rewrite `schema_migrations` in production. A reconciliation note is maintained in `PROJECT_CONTROL/MIGRATION_RECONCILIATION.md`.

A true fresh-PostgreSQL replay could not be executed in the assistant environment because no local PostgreSQL server is available and outbound `git clone` is unavailable. This is explicitly recorded as an evidence gap, not a PASS.

## Supabase Advisor findings

Security Advisor continues to report pre-existing `SECURITY DEFINER` execution warnings and disabled leaked-password protection. These were not changed automatically because they affect application-wide security behavior.

Performance Advisor continues to report existing RLS init-plan, multiple-permissive-policy and unindexed-FK warnings. These are tracked as optimization work and are not current Workforce release blockers.

## GitHub Pages

GitHub Pages has been switched back to the stable `main` branch with `/ (root)` after Phase 10 browser verification. The site URL remains `https://magasincoffee.github.io/noibo/`.

## Next operational checkpoint

1. Complete migration-history reconciliation with a real fresh PostgreSQL/Supabase environment when one is available.
2. Keep `main` protected and all schema changes behind reviewed pull requests.
3. Review global Security Advisor findings as a separate hardening task.
4. Only then start Phase 11.

## Database reset

Live Supabase Auth users and runtime data are not destructively reset by repository changes.
