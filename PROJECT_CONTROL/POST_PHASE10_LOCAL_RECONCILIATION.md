# Post-Phase-10 Local Schema Reconciliation

Date: 2026-08-29

## Purpose

Validate the canonical `main` migration line against the live Supabase production schema without modifying production migration metadata or runtime data.

## Method

1. Enumerated the production migration ledger through Supabase.
2. Enumerated the canonical migration files on `main`.
3. Inspected the live public schema, columns, primary keys, foreign keys, and RLS enablement.
4. Inspected the canonical Workforce migration definitions for Phase 5–10 objects, grants, and RPC contracts.
5. Compared the expected Workforce objects and key constraints to the production schema.
6. Attempted to establish a truly fresh PostgreSQL execution environment locally.

## Result

### Static schema reconciliation — PASS

The production schema contains the expected Workforce V2/P5–P10 objects, including:

- `work_schedules`
- `employee_availability`
- `employee_skills`
- `employee_constraints`
- `staffing_requirements`
- `schedule_generation_runs`
- `schedule_generation_assignments`
- `attendance.schedule_id`
- `shift_swaps.requester_schedule_id`
- `shift_swaps.target_schedule_id`
- `shift_swaps.target_user_id`

The live schema also contains the expected Phase 9 attendance FK to `work_schedules` and Phase 10 FKs from `shift_swaps` to schedules/profiles/stores.

All inspected Workforce tables have RLS enabled.

Canonical Phase 9/10 migration definitions were inspected and their principal schema/RPC contracts are consistent with the live production structures.

### Migration lineage — historical drift confirmed

Production has 23 migration ledger entries while the canonical repository has 20 migration files. The mismatch reflects the previously documented Workforce migration resequencing/reconstruction period. The production-only ledger versions are retained as immutable historical evidence.

No evidence was found that the mismatch represents missing live Workforce schema objects.

### True fresh-PostgreSQL execution — NOT RUN

The execution environment used for this audit does not contain a PostgreSQL server binary and cannot clone GitHub repositories over outbound network. Therefore a full `apply all migrations from zero` test against a fresh PostgreSQL database could not be honestly executed.

This is intentionally recorded as **NOT RUN**, not PASS.

## Safety decision

Do not edit `supabase_migrations.schema_migrations` in production.

Do not fabricate placeholder migrations solely to match the production ledger count.

Do not rerun historical/destructive migrations against production.

Use the canonical `supabase/migrations` sequence on `main` for new/fresh environments.

Before any future schema-changing phase, perform a real fresh-PostgreSQL migration replay in an environment that provides PostgreSQL (or a Supabase Pro development branch) and compare the resulting schema with production.

## Phase-10 conclusion

This reconciliation does not identify a Phase-10 runtime blocker. Phase 10 remains functionally complete and browser/runtime verified. The remaining item is migration-governance hardening for future schema changes.
