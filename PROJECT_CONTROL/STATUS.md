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

- `main` is at signed merge commit `823b58dd328d65d90e96555d40b38875b8b038c7`.
- Workforce V2 CI passed on the post-merge `main` commit.
- The merge commit is GitHub-verified.
- `main` is currently unprotected; branch protection/ruleset hardening remains an operational follow-up.

## Migration history finding

Production contains 23 entries in `supabase_migrations.schema_migrations`, while the repository currently contains 20 migration files. Later Workforce migration timestamps do not map 1:1 to the production ledger versions.

This is treated as **migration-history drift**, not confirmed schema drift. The live schema and runtime behavior were verified. Do not manually rewrite `schema_migrations` in production. Before the next schema-changing phase, perform an explicit migration-history reconciliation/reconstruction checkpoint.

## Supabase Advisor findings

Security Advisor continues to report pre-existing `SECURITY DEFINER` execution warnings and disabled leaked-password protection. These were not changed automatically because they affect application-wide security behavior.

Performance Advisor continues to report existing RLS init-plan, multiple-permissive-policy and unindexed-FK warnings. These are tracked as optimization work and are not current Workforce release blockers.

## GitHub Pages

During Phase 10 browser verification, Pages was temporarily configured to the Phase-10 branch. For the stable post-merge baseline, Pages should publish from `main`. This setting cannot be changed through the connected GitHub API in this session and requires the repository Pages settings UI.

## Next operational checkpoint

1. Point GitHub Pages source back to `main`.
2. Reconcile migration history before the next database-changing phase.
3. Harden `main` branch protection/rules.
4. Review global Security Advisor findings as a separate security-hardening task.
5. Only then start Phase 11.

## Database reset

Live Supabase Auth users and runtime data are not destructively reset by repository changes.
