# MAGASIN Scheduler Domain Rules V1

Date: 2026-08-28
Status: Canonical domain rulebook for Workforce/Schedule V2

## 1. Scope

This document converts the Workforce V2 architecture into explicit scheduler domain rules. It is normative for later scheduler engine, validation RPC and review/publish work.

The scheduler runs against Supabase/PostgreSQL data using the business timezone `Asia/Ho_Chi_Minh`. It produces a deterministic draft only. It does not publish automatically.

## 2. Rule classes

- HARD: violation invalidates the candidate or blocks publication.
- SOFT: used for deterministic scoring/ranking after hard filtering.
- DERIVED: defines how eligibility, coverage, hours and explanations are calculated.

## 3. Canonical inputs

Only these V1 inputs are authoritative: `profiles`, `stores`, `employee_grades`, `work_schedules`, `employee_availability`, `employee_skills`, `employee_constraints`, `staffing_requirements`, and generation/run metadata. Business rules must not be inferred from frontend labels or browser state.

## 4. Time rules

T01 — Business timezone (HARD): all interpretation uses `Asia/Ho_Chi_Minh`.

T02 — Week boundary (HARD): one generation is exactly Monday-Sunday; `week_end = week_start + 6 days`.

T03 — Overnight shifts excluded (HARD): V1 requires `end_time > start_time`; no midnight wrapping.

T04 — Interval semantics (DERIVED): intervals are half-open `[start, end)`. End-at-start does not overlap.

## 5. Employee eligibility

E01 — Active employee (HARD): only `profiles.status = ACTIVE` may receive assignments.

E02 — Store eligibility (HARD): if `employee_constraints.allowed_store_ids` is non-empty, store must be listed; otherwise fall back to profile `access_scope`. `preferred_store_id` never grants eligibility.

E03 — Consistent employee record (HARD): assignment user must still have a valid active profile at final validation.

## 6. Availability

A01 — Full containment (HARD): candidate interval must be fully contained in at least one `AVAILABLE` or `PREFERRED` window for the same employee/date.

A02 — Unavailable exclusion (HARD): any overlap with `UNAVAILABLE` invalidates the candidate.

A03 — Unavailable precedence (HARD): overlapping `UNAVAILABLE` always wins over workable windows.

A04 — Multiple windows (DERIVED): multiple availability rows per employee/day are allowed; any matching workable window may qualify.

A05 — Preferred window (SOFT): `PREFERRED` is workable plus a score bonus.

A06 — No availability (HARD): no matching workable window means candidate rejection.

## 7. Skills

S01 — Generic demand (HARD): `skill_code IS NULL` means generic headcount; `min_skill_level` must be zero.

S02 — Skill demand (HARD): matching active skill with `level >= min_skill_level` is required to count toward skill demand.

S03 — Inactive skill excluded (HARD): inactive rows never satisfy requirements.

S04 — Skill range (HARD): level is 0..4.

S05 — Generic contribution (DERIVED): a skill-qualified employee may also count once toward overlapping generic demand.

## 8. Employee constraints

C01 — Daily cap (HARD): when `max_daily_hours > 0`, total assigned duration for the date must not exceed it.

C02 — Weekly cap (HARD): when `max_weekly_hours > 0`, total assigned duration in the generation week must not exceed it.

C03 — Minimum rest (HARD): when `min_rest_hours > 0`, elapsed rest between adjacent assignments must meet the configured minimum.

C04 — No overlap (HARD): an employee cannot have overlapping assignments, including relevant official schedules during generation/revalidation.

C05 — Zero semantics (DERIVED): zero max/rest values mean no configured limit in V1.

C06 — Solo capability (HARD when solo work is required): `employee_constraints.can_work_alone = false` cannot satisfy a solo-only situation.

C07 — Mentor-required (HARD): `mentor_required = true` requires a compatible concurrent mentor before publication.

## 9. Mentor rules

M01 — Same skill (HARD): mentor has active `employee_skills` for the required skill.

M02 — Skill level (HARD): mentor level is at least the requirement minimum.

M03 — Mentor capability (HARD): mentor skill row has `can_mentor = true`.

M04 — Same store/time (HARD): mentor must overlap trainee at the same store and time.

M05 — Mentor sharing (DERIVED): one mentor may support multiple compatible trainees in V1; no ratio limit.

## 10. Staffing requirements

R01 — Numeric hierarchy (HARD): `0 <= minimum <= target <= maximum`.

R02 — Interval coverage (HARD): coverage is evaluated over time sub-intervals, not daily totals.

R03 — Minimum shortage (HARD): any sub-interval below minimum is invalid for publication.

R04 — Target coverage (SOFT): maximize coverage toward target after minimum is protected.

R05 — Maximum bound (HARD): any sub-interval above maximum is invalid.

R06 — Generic coverage (DERIVED): counts all eligible assigned employees overlapping the requirement.

R07 — Skill coverage (DERIVED): counts only matching qualified employees.

R08 — One contribution (DERIVED): one employee contributes at most one headcount to a requirement at a time.

## 11. Generation

G01 — Deterministic result (HARD): identical normalized input + algorithm version produces identical assignments and ordering.

G02 — No random tie-breaking (HARD): no randomness, physical row order or timestamps may decide ties.

G03 — Stable tie-break (DERIVED): canonical tuple is `work_date, start_time, store_id, requirement_id, user_id`; if no requirement ID exists, derive a stable key from normalized requirement fields.

G04 — Draft only (HARD): generation never writes official `work_schedules`.

G05 — Algorithm version (HARD): every generation records a stable version identifier.

G06 — Final revalidation (HARD): a draft must pass all hard rules immediately before review/publish.

## 12. Soft scoring priority

After hard filtering, rank in this order:

1. satisfy minimum staffing;
2. maximize skill-qualified coverage;
3. move coverage toward target without exceeding maximum;
4. preferred store;
5. preferred availability;
6. reduce weekly-hour imbalance;
7. reduce unnecessary store changes;
8. reduce fragmented assignments;
9. reduce estimated labor cost when higher priorities are equal.

Lower-priority objectives never override a higher-priority hard rule.

## 13. Coverage states

Validation must split each requirement interval at distinct boundaries from the requirement and overlapping assignments.

- `UNDER_MINIMUM`: any sub-interval below minimum.
- `TARGET_MET`: minimum and target met for the full interval without exceeding maximum.
- `PARTIAL`: minimum is met but target is not met for at least one sub-interval.
- `OVER_MAXIMUM`: any sub-interval above maximum.

`UNDER_MINIMUM` and `OVER_MAXIMUM` block publication.

## 14. Explanation codes

Hard-block examples: `EMPLOYEE_INACTIVE`, `STORE_NOT_ALLOWED`, `NOT_AVAILABLE`, `UNAVAILABLE_OVERLAP`, `EMPLOYEE_ASSIGNMENT_OVERLAP`, `DAILY_HOURS_LIMIT`, `WEEKLY_HOURS_LIMIT`, `MIN_REST_NOT_MET`, `SKILL_NOT_QUALIFIED`, `MENTOR_REQUIRED`, `MINIMUM_COVERAGE_SHORTAGE`, `MAXIMUM_COVERAGE_EXCEEDED`.

Non-fatal examples: `TARGET_NOT_MET`, `PREFERRED_STORE_NOT_USED`, `PREFERRED_WINDOW_NOT_USED`, `WEEKLY_HOURS_IMBALANCE`, `STORE_CHANGE_PENALTY`, `SPLIT_ASSIGNMENT_PENALTY`.

Hard violations must be machine-readable and publication-blocking.

## 15. Official schedule interaction

Official `work_schedules` rows remain authoritative operational assignments. V1 generation is additive draft planning and must not silently replace or overlap official rows. Replacement semantics belong to the publish/revision phase.

## 16. Review/publish boundary

Generate → Validate → Review → Revalidate → Publish. The browser never proves validity with a client-side flag. Publish must execute through a controlled transaction/RPC.

## 17. V1 exclusions

No overnight shifts, recurring availability templates, labor-law rules absent from the current schema, automatic publication/notifications, inventory/POS demand integration, advanced solver dependencies, or mentor ratios beyond V1 sharing.

## 18. Implementation invariant

`candidate -> hard filter -> deterministic score/order -> draft -> validate -> review -> revalidate -> publish`

Any exception requires an explicit architecture change; scheduler code must not silently redefine these rules.
