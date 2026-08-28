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
| P3 deterministic scheduler | PASS WITH GAP | Deterministic greedy engine exists, but its `min_rest_hours` check is currently same-day only; P0/P2 semantics require cross-date rest. |
| P4 independent validator | PASS WITH GAP | Validator independently checks hard constraints, but runtime execution has not yet been proven on the target environment. |
| P5 Supabase RPC | PASS | Controlled authenticated RPC boundary exists for availability, staffing demand and generation drafts. |
| P6 employee UI | PASS | Weekly schedule + availability surface exists. |
| P7 manager UI | PASS | Staffing demand and generation review surface exists. |
| P8 review/publish | BLOCKED | Source exists, but runtime SQL verification is still required. The implementation also needs a focused regression pass around PL/pgSQL `FOUND` state and cross-date rest before production merge. |
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

## Blocking findings before merge

### 1. Scheduler cross-date rest mismatch

`scheduler/src/index.js` currently calculates `restOk()` using only assignments on the same `work_date`. This can allow the generator to propose a Monday morning assignment after a Sunday late shift even when `min_rest_hours` is violated. The server validator is the final safety gate, but the generation engine should still implement the canonical rule directly.

Required correction: compare assignments using a full date-time coordinate (`work_date + time`) so previous-day/next-day rest is enforced during generation.

### 2. Phase 8 PL/pgSQL variable-state regression risk

The P8 validator uses `SELECT ... INTO` followed by other `SELECT` statements and later branches on `FOUND`. `FOUND` is statement-scoped state in PL/pgSQL and can be overwritten by subsequent statements. The final code must use explicit booleans such as `c_exists` instead of relying on a later `FOUND` value for daily/weekly/rest/mentor checks.

Required correction: run a focused SQL regression test with and without an `employee_constraints` row and with/without a matching skill row, then verify all hard rules fire correctly.

### 3. Runtime verification unavailable in repository-only environment

Source and diff review can be completed here, but the target Supabase runtime and deployed GitHub Pages environment have not been executed from this repository session. Production merge therefore remains blocked until the migration/RPC/UI smoke suite passes.

## Merge gate

Do not merge `workforce-v2-integration` into `main` until all of the following are PASS:

- scheduler cross-date rest regression fixed;
- Phase 8 PL/pgSQL regression fixed and tested;
- Supabase migrations applied successfully in the target project;
- positive/negative RPC cases pass with real OWNER/STORE_MANAGER/employee roles;
- review and publish transaction/rollback cases pass;
- schedule-linked attendance check-in/out cases pass;
- GitHub Pages employee and manager smoke tests pass;
- full repository test/CI checks pass.

## Main branch hygiene

No `noop-test2`, `dummy`, `dummy2`, `dummy3`, `dummy-final`, or `x` test files are present on `main` after the cleanup checks performed during this integration run.

## Current decision

`workforce-v2-integration` is the canonical review branch for P0–P9, but it is **NOT merge-ready yet**. The next implementation pass should fix the two code-level blockers above and then execute the runtime verification gate.