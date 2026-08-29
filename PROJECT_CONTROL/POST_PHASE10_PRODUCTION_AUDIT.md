# Post-Phase-10 Production Audit

Date: 2026-08-29

## Canonical baseline

- Git branch: `main`
- Main commit: `823b58dd328d65d90e96555d40b38875b8b038c7`
- Phase 10 PR: #16, merged
- Backend: Supabase project `MAGASIN-NOIBO`
- Frontend: GitHub Pages (`web/`)

## Production health

- Supabase project status: `ACTIVE_HEALTHY`
- PostgreSQL: 17.6.1.166
- Database timezone: UTC
- Application displays Vietnam time explicitly where required.
- Four stores exist and are ACTIVE: `CN1`–`CN4`.

## Workforce state

- OWNER ACTIVE: 1
- STAFF ACTIVE: 1
- STAFF PENDING: 3
- No Phase-10 test staff remain ACTIVE.

## Phase-10 data cleanup

Verified after browser E2E cleanup:

- `shift_swaps` test rows: 0
- `work_schedules` rows marked `PHASE10_UI_TEST`: 0
- Phase-10 availability test rows: 0

## Security boundary

Verified on production:

- RLS enabled on `profiles`, `stores`, `work_schedules`, `attendance`, `employee_availability`, and `shift_swaps`.
- `anon` has no execute privilege on the Phase-10 RPCs.
- `authenticated` has no direct INSERT/UPDATE/DELETE privilege on `work_schedules`, `attendance`, or `shift_swaps`.
- Phase-10 writes are RPC-only.

## CI / main stability

- Workforce V2 CI passed on the merge commit immediately after PR #16 merge.
- `main` points to the signed merge commit for Phase 10.
- Repository is currently unprotected; branch protection/ruleset hardening is a follow-up operational task.

## Supabase Advisor findings

Security Advisor still reports pre-existing `SECURITY DEFINER` execution warnings and disabled leaked-password protection. These are not introduced by the Phase-10 merge and were not changed automatically because doing so would alter application-wide security behavior.

Performance Advisor reports existing RLS init-plan and unindexed-FK warnings, plus an unused Phase-10 store-status index. These are optimization backlog items, not release blockers.

## Migration ledger finding

Production has 23 entries in `supabase_migrations.schema_migrations`. The repository currently contains 20 migration files, and the timestamp/version names are not a 1:1 match for the later Workforce migrations.

This is treated as **migration-history drift**, not proof of schema drift. The live schema and runtime behavior are verified. Do not manually rewrite `schema_migrations` in production. Before the next database-changing phase, reconcile the migration history through an explicit migration-repair/reconstruction checkpoint so fresh environments and future `db push` operations remain deterministic.

## Pages deployment

During Phase 10 browser verification, GitHub Pages was temporarily configured to the Phase-10 branch. The stable post-merge configuration should publish from `main`. This is a browser/settings operation and cannot be completed by the connected GitHub API used in this session.

## Release decision

Phase 10 functionality is production-verified and merged. `main` is functionally stable for the current feature set. The two operational follow-ups are:

1. Switch GitHub Pages source back to `main`.
2. Reconcile migration-history drift before the next schema-changing phase.
