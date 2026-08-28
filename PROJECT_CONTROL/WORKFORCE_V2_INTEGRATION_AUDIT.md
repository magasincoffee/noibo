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
| P3 deterministic scheduler | PASS | Cross-date `min_rest_hours` is enforced using a full date-time coordinate. Regression test added for Sunday-to-Monday rest. |
| P4 independent validator | PASS WITH GAP | Validator independently checks hard constraints; runtime execution on the target environment is still required. |
| P5 Supabase RPC | PASS | Controlled authenticated RPC boundary exists for availability, staffing demand and generation drafts. |
| P6 employee UI | PASS | Weekly schedule + availability surface exists. |
| P7 manager UI | PASS | Staffing demand and generation review surface exists. |
| P8 review/publish | PASS WITH REGRESSION GATE | Current validator uses explicit `c_exists` / `skill_exists`; SQL regression guard asserts it does not fall back to fragile `FOUND` checks. Runtime SQL verification remains required. |
| P9 attendance | BLOCKED | Schedule-linked attendance migration/UI exists, but runtime Supabase/GitHub Pages verification is still required. |

## Confirmed structural chain

```text
availability + skills + constraints + staffing demand
        -> deterministic scheduler
        -> generation draft
        -> server-side validation
        -> review
        -> final revalidation
        -> atomic publish
        -> approved work_schedules
        -> attendance.schedule_id
```

## Blocker resolution record

### 1. Scheduler cross-date rest mismatch — FIXED

`scheduler/src/index.js` now converts `work_date + time` to an absolute minute coordinate before checking rest. This prevents a Monday assignment from being accepted after a Sunday assignment when the gap is below `min_rest_hours`.

Regression coverage is present in `scheduler/test/scheduler.test.js`.

### 2. Phase 8 PL/pgSQL `FOUND` regression risk — GUARDED

The current P8 validator already uses explicit booleans (`c_exists`, `skill_exists`) for constraint/skill lookup state. A database regression test was added at `supabase/tests/workforce_v2_review_publish_regression.sql`.

The test checks the deployed routine definition for explicit state handling and cross-date rest logic, and documents behavioral fixtures for the target database.

## Runtime verification status

A local `git clone`/Node test attempt was blocked because the execution environment cannot resolve `github.com`. No GitHub Actions run is associated with the current integration commit. Therefore runtime verification is still pending and is **not** claimed as PASS.

## Merge gate

Do not merge `workforce-v2-integration` into `main` until all of the following are PASS:

- Node scheduler regression suite passes;
- SQL regression guard passes on the target Supabase database;
- all Supabase migrations apply cleanly in the target project;
- positive/negative RPC cases pass with real OWNER/STORE_MANAGER/employee roles;
- review and publish transaction/rollback cases pass;
- schedule-linked attendance check-in/out cases pass;
- GitHub Pages employee and manager smoke tests pass;
- full repository test/CI checks pass.

## Current decision

`workforce-v2-integration` is the canonical P0–P9 integration branch. The two code-level blockers identified by the audit are resolved/guarded. The remaining blocker is runtime verification against the actual Supabase and deployed GitHub Pages environments.
