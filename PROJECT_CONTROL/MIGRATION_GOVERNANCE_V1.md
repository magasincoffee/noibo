# MAGASIN — Migration Governance Policy V1

## Status

This policy is the canonical governance rule for Supabase schema changes after Workforce Phase 10.

## Source of truth

- `supabase/migrations/` on protected `main` is the canonical **forward** migration source.
- The production `supabase_migrations.schema_migrations` ledger is immutable historical evidence.
- A count mismatch alone is not permission to rewrite production metadata.

## Immutable history rule

Never:

1. delete or update production migration-ledger rows;
2. insert fabricated ledger rows or placeholder migrations to make counts match;
3. rename an already-applied migration version;
4. replay historical/destructive migrations against production.

## New migration rule

Every schema change must:

1. use one new UTC timestamp version in `YYYYMMDDHHMMSS_description.sql` format;
2. be lexically unique and strictly newer than the repository's current maximum version;
3. be additive/forward-only unless an explicit reviewed rollback strategy exists;
4. preserve existing runtime contracts unless the change is explicitly versioned and approved;
5. pass CI migration-governance checks before merge.

## Fresh-environment gate

Before any Phase 11 schema-changing PR is merged:

1. replay canonical migrations on a real fresh PostgreSQL/Supabase environment;
2. compare resulting schema contracts with the production baseline;
3. record PASS/FAIL/NOT RUN honestly;
4. attach the evidence to the PR/release record.

A static repository check is necessary but does **not** replace a real fresh-database replay.

## Drift classification

The existing 23-vs-20 historical mismatch is classified as:

`MIGRATION_HISTORY_DRIFT_RESEQUENCED`

It is not confirmed schema drift. The known production-only lineage remains documented in:

`PROJECT_CONTROL/MIGRATION_RECONCILIATION.md`.

## Emergency rule

A production hotfix must still create a corresponding reviewed canonical migration before the next schema-changing release. Production metadata is never manually edited to simulate repository history.
