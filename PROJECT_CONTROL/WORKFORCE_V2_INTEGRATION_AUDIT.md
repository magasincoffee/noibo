# Workforce V2 — Integration Audit P0–P9

## Scope

Canonical integration baseline:

`P7 d8f618d90ab11e33b45d1fa9790fecccb8b1da24` + P8/P9 backend checkpoint `c9a28e42023fb5cee54ea0d1f8880ee7c636d7f5` + P9 employee attendance UI from `1887f6d44cb02470bbc8aba15c547c8f6c17eb38`.

Integration branch: `workforce-v2-integration`.

## Audit status

| Area | Status | Notes |
| --- | --- | --- |
| P0 architecture | PASS | Workforce V2 architecture/rules are present in canonical chain. |
| P1 database integrity | PASS | Integrity migration and indexes are present. |
| P2 scheduler rules | PASS | Rulebook is present and is the contract for P3/P4. |
| P3 deterministic scheduler | PASS | Cross-date `min_rest_hours` is enforced using a full date-time coordinate. Regression test exists for Sunday-to-Monday rest. |
| P4 independent validator | PASS | Server-side validator was deployed and exercised in the production E2E transaction test. |
| P5 Supabase RPC | PASS | Controlled authenticated RPC boundary exists for availability, staffing demand and generation drafts. Production compile/grant checks passed. |
| P6 employee UI | PASS | Weekly schedule + availability surface exists. |
| P7 manager UI | PASS | Staffing demand and generation review surface exists. Production `list_schedule_generations()` check passed. |
| P8 review/publish | PASS | Validation/review/publish RPCs compiled, permission checks passed, and full E2E review→publish transaction passed with rollback cleanup. |
| P9 attendance | PASS WITH DEPLOYMENT GAP | Schedule-linked attendance migration/RPCs are deployed. Full E2E check-in→check-out passed inside a rollback/cleanup transaction. GitHub Pages browser smoke test remains pending. |

## Production migrations applied

The target Supabase project `MAGASIN-NOIBO` is healthy and now contains the runtime migrations corresponding to Workforce P5–P9. The connector records migration versions using application timestamps rather than the Git filename version numbers; this metadata drift is documented and must be reconciled before relying on CLI migration history as the sole source of truth.

A corrective migration was also applied to add `schedule_generation_runs.updated_at`, because the existing `set_updated_at` trigger was attached to that table although the column was missing. This was discovered by the first E2E run and fixed before the successful rerun.

## Runtime verification

### Successful E2E transaction test

Using an existing ACTIVE OWNER profile and temporary test rows inside a single database transaction, the following real production functions were exercised:

```text
create_schedule_generation
-> replace_schedule_generation_assignments
-> validate_schedule_generation_v1
-> review_schedule_generation(APPROVED)
-> publish_schedule_generation
-> work_schedules row created as APPROVED / MANAGER_ASSIGNED
-> get_my_today_schedules
-> clock_in_for_schedule
-> clock_out_attendance
-> attendance row COMPLETED
```

All steps passed. The transaction then deleted all temporary rows. A post-test query confirmed zero remaining E2E store, attendance or generation rows.

### Negative/security checks

- Workforce RPCs are `EXECUTE` denied to `anon` and allowed to `authenticated`.
- Direct `authenticated` INSERT/UPDATE to `work_schedules` and `attendance` is denied.
- STAFF role cannot call manager generation discovery (`ROLE_NOT_ALLOWED`).
- Invalid generation input is rejected server-side.
- Unaudited/unauthenticated `clock_in_for_schedule` returns `AUTH_REQUIRED`.

## Security advisor notes

Supabase Security Advisor still reports pre-existing/general `SECURITY DEFINER` exposure warnings on legacy helper functions (`can_access_store`, `current_user_role`, approval helpers, etc.) and a mutable search path warning on `set_updated_at`. These are not Workforce-specific runtime failures and are tracked separately for security hardening. The new Workforce RPCs themselves have no `anon` execute grant.

## Remaining merge gates

The following are still required before merging the integration branch into `main`:

- browser smoke test against the deployed GitHub Pages app for employee and manager flows;
- full repository test/CI checks (no current GitHub Actions run was available for the integration commit);
- reconcile Git migration filenames with Supabase migration history metadata;
- review and separately remediate the legacy Security Advisor warnings where appropriate.

## Current decision

`workforce-v2-integration` is the canonical P0–P9 integration branch. The scheduler/validator blockers are resolved. Production Supabase runtime verification for the core P5–P9 path now passes, including an end-to-end review/publish/attendance transaction with cleanup. The integration is **not yet approved for merge to `main`** until the deployment/CI/security/documentation gates above are closed.
