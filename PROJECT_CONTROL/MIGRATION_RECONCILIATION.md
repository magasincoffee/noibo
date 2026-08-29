# Supabase Migration Lineage Reconciliation

Date: 2026-08-29

## Scope

Compare the production `supabase_migrations.schema_migrations` ledger with the canonical migration filenames in `supabase/migrations` on `main`, and define a repair strategy that does not rewrite production migration metadata.

## Observed state

Production currently contains 23 migration ledger versions.

The canonical repository currently contains 20 migration files.

The first 12 versions (`20260828000100` through `20260828001200`) are common to both sides. The remaining Workforce-era versions are not a 1:1 filename/version match.

Production-only ledger versions include:

- `20260828171116`
- `20260828171239`
- `20260828171312`
- `20260828171333`
- `20260828172419`
- `20260828173817`
- `20260828173845`
- `20260828175047`
- `20260829013007`
- `20260829013128`

Repository-only canonical versions include the later Workforce sequence beginning with:

- `20260828001300_workforce_rpc_api_v1.sql`
- `20260828001400_workforce_generation_list_api.sql`
- `20260828001500_workforce_review_publish_v1.sql`
- `20260828001600_attendance_schedule_link_v1.sql`
- `20260829000200_seed_initial_magasin_stores.sql`
- `20260829000300_shift_swap_schedule_integration_v1.sql`
- `20260829000400_shift_swap_read_api_v2.sql`

`20260829000100_workforce_generation_updated_at_fix.sql` is common to both sides.

## Lineage evidence

Git history shows a cleanup/reconstruction period in which Workforce migrations were moved to review branches, an accidental placeholder migration was reverted from `main`, and canonical migration files were subsequently added. Git history for the production-only `2026082817xxxx` versions does not contain files with those exact version names.

This strongly indicates that the production ledger preserves historical application events from the pre-canonical migration sequence, while the repository now represents the cleaned canonical sequence.

The production schema was independently inspected after Phase 10. The live database contains the expected Workforce V2/P10 tables, RLS boundaries, and RPC surface, including:

- `work_schedules`
- `employee_availability`
- `staffing_requirements`
- `schedule_generation_runs`
- `schedule_generation_assignments`
- `shift_swaps`
- Phase 5–10 Workforce RPCs

No evidence was found that the production-only ledger entries correspond to currently missing Workforce objects.

## Local reconciliation result

A true fresh-PostgreSQL replay was attempted conceptually but **could not be executed in this assistant environment** because there is no local PostgreSQL server available and outbound `git clone` is unavailable. Therefore:

- **Static schema reconciliation: PASS** for the inspected Workforce V2/P5–P10 tables, keys, RPC surface and RLS boundaries.
- **Fresh PostgreSQL replay: NOT RUN.** This is an explicit evidence gap, not a passing result.
- No production schema or migration metadata was changed as part of this reconciliation.

## Decision

Classify the mismatch as **migration-history drift / resequencing history**, not confirmed schema drift.

Do **not**:

1. delete rows from `supabase_migrations.schema_migrations`;
2. insert fabricated placeholder migrations solely to make counts match;
3. rename already-applied production ledger versions;
4. re-run historical destructive migrations against production.

## Safe repair plan

Before the next schema-changing phase:

1. Freeze the current production schema as the runtime baseline.
2. Treat the existing production ledger as immutable historical evidence.
3. Treat `supabase/migrations/` on `main` as the forward canonical migration source for fresh environments.
4. For any future migration, use a new timestamp/name that has never been applied.
5. Reconstruct exact old-to-new migration mappings only when the original SQL content is recoverable from Git/backup; otherwise record the mapping as historical/unknown instead of fabricating equivalence.
6. Validate a fresh Supabase branch/database from the canonical repository migrations and compare its schema objects, RPC signatures, RLS policies, constraints and indexes to production before introducing another schema change.

## Release gate

The migration drift is **not a P0/P10 runtime blocker** because production runtime behavior and security boundaries were verified. It **is a pre-Phase-11 database-governance gate**: Phase 11 must not introduce new schema changes until this canonical-vs-production migration lineage has been validated on a fresh database/branch.
