# MAGASIN Workforce & Schedule Architecture V2

Date: 2026-08-28
Status: Canonical design baseline for implementation

## 1. Purpose

This document defines the canonical semantics for MAGASIN Workforce V2 and the schedule lifecycle. It is the contract for subsequent database, scheduler, RPC and UI work.

The implementation target is Supabase/PostgreSQL + GitHub Pages. Google Apps Script, Google Sheets and `google.script.run` are not part of this architecture.

## 2. Canonical time model

- Business timezone: `Asia/Ho_Chi_Minh`.
- A scheduling week is Monday through Sunday.
- `week_start` is the Monday of the scheduling week.
- `week_end` is `week_start + 6 days` and is inclusive.
- Stored business dates are PostgreSQL `date`; clock times are PostgreSQL `time` where the interval does not cross midnight; event timestamps use `timestamptz`.
- V1 does **not** support overnight shifts. Existing checks require `end_time > start_time`. Overnight support is a future explicit architecture change, not an implicit scheduler workaround.
- Candidate generation and validation must use one consistent timezone; no browser-local timezone may change the business meaning of a schedule.

## 3. Core entities

### `work_schedules`

The published/operational schedule. It is the source used by downstream attendance linkage.

Relevant lifecycle: `PENDING`, `APPROVED`, `CANCELLED`.

`APPROVED` means an individual schedule row is approved/official in the current schema. Workforce V2 generation uses a separate generation lifecycle described below.

### `employee_availability`

Employee-declared work windows for a concrete date. Multiple rows per employee/day are allowed.

Semantics:
- `AVAILABLE`: the employee declares the interval as workable.
- `PREFERRED`: the employee declares the interval as workable and prefers assignments there; it contributes a soft score bonus.
- `UNAVAILABLE`: the employee declares the interval as not workable and it excludes overlapping candidate assignments.
- An assignment is availability-compatible when its complete interval is contained in at least one `AVAILABLE` or `PREFERRED` window and it does not overlap any `UNAVAILABLE` window.
- `UNAVAILABLE` overrides `AVAILABLE`/`PREFERRED` when intervals overlap.
- Availability rows are date-specific in V1; there is no recurring weekly template table yet.

### `employee_skills`

Verified capabilities per employee and skill. `level` is 0..4.

For a staffing requirement with `skill_code`, the employee must have an active matching skill with `level >= min_skill_level`.

`can_mentor` is interpreted per skill: the mentor must hold the same required `skill_code`, be active, and have sufficient skill level for the requirement.

### `employee_constraints`

Employee-level limits and placement constraints:
- `max_daily_hours` and `max_weekly_hours` are hard caps.
- `min_rest_hours` is a hard minimum between the end of one assigned interval and the start of the next.
- `allowed_store_ids` is authoritative when non-empty.
- When `allowed_store_ids` is empty, the scheduler falls back to the employee's profile `access_scope` for store eligibility.
- `preferred_store_id` is a soft preference, not an eligibility requirement.
- `mentor_required` means the employee cannot be considered independently qualified to work alone; a compatible mentor must overlap the assignment at the same store/time.
- `can_work_alone` on constraints expresses employee-level solo-work capability; skill-level `can_work_alone` expresses capability for a specific skill. Effective solo capability requires both to be true.

### `staffing_requirements`

Demand by store/date/time/skill. `minimum_headcount`, `target_headcount` and `maximum_headcount` are hard upper/lower bounds as follows:
- below `minimum_headcount` = shortage/invalid coverage;
- `target_headcount` = preferred coverage objective;
- above `maximum_headcount` = invalid assignment set.

A row without `skill_code` represents generic headcount demand. A row with `skill_code` represents skill-qualified demand.

### `schedule_generation_runs`

One scheduler execution and its review/publish lifecycle.

V1 supports:
- single-store generation when `store_id` is set;
- multi-store generation when `store_id` is null.

The week range is always one Monday-Sunday week. `algorithm_version` must identify the deterministic rule set that produced the result.

Lifecycle:
`DRAFT -> REVIEWED -> PUBLISHED`
with cancellation from pre-publish states.

Generation never publishes automatically.

### `schedule_generation_assignments`

Candidate assignments belonging to a generation run. They are not operational schedule rows until publish succeeds.

V1 assignment status is `DRAFT`, `ACCEPTED`, `REJECTED`, `CANCELLED`.

## 4. Scheduling hard constraints

1. Employee is active and eligible for the selected store.
2. Assignment interval is inside employee availability.
3. Assignment does not overlap employee `UNAVAILABLE` availability.
4. Employee does not have overlapping assignments.
5. Daily assigned hours do not exceed `max_daily_hours` when the cap is greater than zero.
6. Weekly assigned hours do not exceed `max_weekly_hours` when the cap is greater than zero.
7. Rest time between assignments meets `min_rest_hours` when the limit is greater than zero.
8. Employee meets required skill and minimum skill level.
9. Employee/store eligibility rules are satisfied.
10. An assignment cannot push a requirement above `maximum_headcount`.
11. A mentor-required employee must have a compatible mentor overlapping the same store/time when the assignment is considered for publication.
12. Any schedule generation presented as valid must pass a final conflict/constraint validation immediately before review/publish.

## 5. Soft objectives and deterministic ordering

Soft objectives are evaluated only after hard-constraint filtering. V1 should use a deterministic score/order; no random tie-breaking.

Recommended priority order for V1:
1. Satisfy all minimum staffing demand.
2. Maximize skill-qualified coverage.
3. Move coverage toward target headcount without exceeding maximum.
4. Respect preferred store.
5. Respect `PREFERRED` availability.
6. Reduce employee weekly-hour imbalance.
7. Reduce unnecessary store changes.
8. Reduce fragmented/split assignments.
9. Reduce estimated labor cost where coverage quality is otherwise equal.

Ties must be broken deterministically using stable identifiers and chronological order, for example: `work_date, start_time, store_id, requirement_id, user_id`.

## 6. Requirement coverage semantics

Coverage is evaluated over time intervals, not merely by daily totals. For a requirement interval, distinct assignment boundaries split it into sub-intervals. A requirement is:
- `UNDER_MINIMUM` when coverage is below minimum for any sub-interval;
- `TARGET_MET` when minimum is met and target is met for the full interval;
- `PARTIAL` when minimum is met but target is not met for at least one sub-interval;
- `OVER_MAXIMUM` when any sub-interval exceeds maximum.

Generic headcount requirements count all eligible assigned employees. Skill-qualified requirements count only employees satisfying the specified skill and level.

## 7. Mentor semantics

A mentor-required employee may be assigned only when at least one concurrently assigned employee at the same store:
- has the required skill;
- has an active skill row;
- meets the required minimum level;
- has `can_mentor = true` for that skill.

One mentor may support multiple compatible trainees in V1 unless a later business rule introduces a ratio.

## 8. Generation vs official schedule

The generation layer and operational schedule layer are intentionally separate.

```text
schedule_generation_runs
        |
        +-- schedule_generation_assignments
        |
        |  manager review
        v
     PUBLISHED
        |
        v
  work_schedules
```

Publish must be atomic from the user's perspective. The browser must not promote a generation by direct table update; a controlled RPC/transaction must perform final validation and publish.

## 9. Review rules

Managers review staffing coverage, skill coverage, hard/soft warnings, total hours, estimated cost and employee/store distribution. Hard violations block publication. Draft edits require revalidation.

## 10. Attendance linkage

Published schedule rows become the planning source for attendance. Attendance may snapshot `planned_start` and `planned_end`; later schedule revisions must not silently rewrite historical attendance calculations.

## 11. Shift swap linkage

A shift-swap request does not change the official schedule when submitted. Only an approved swap workflow may modify the effective schedule and must revalidate conflicts and skill/mentor constraints.

## 12. Roles

- `OWNER`: manages staffing requirements, scheduler runs and publication across all stores.
- `STORE_MANAGER`: reviews/manages schedule data within `access_scope`.
- `STAFF`: owns own availability and reads own official schedule.
- `INVENTORY_MANAGER`: no additional workforce scheduling authority is introduced here.

RLS remains mandatory. Frontend visibility is not a security boundary.

## 13. V1 exclusions

No overnight shifts, recurring availability templates, labor-law rules absent from the current schema, automatic publication/notifications, inventory/POS demand integration, advanced optimization dependencies, or automatic schedule replacement after a shift swap.
