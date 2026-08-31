# Migration Governance Contract

## Machine-checkable invariants

The CI validator enforces:

- every file in `supabase/migrations/` matches `^[0-9]{14}_.+\\.sql$`;
- migration versions are unique;
- filenames are in strict lexical/version order;
- no migration is named as a placeholder;
- the historical drift record remains explicitly documented;
- canonical migration governance policy exists.

## Evidence levels

- **STATIC_PASS**: repository invariants pass.
- **RUNTIME_PASS**: live production objects/contracts were checked.
- **FRESH_REPLAY_PASS**: canonical migrations were applied from zero on a real fresh database.
- **NOT_RUN**: evidence unavailable; never report as PASS.

Current state after Phase 10:

`STATIC_PASS + RUNTIME_PASS + FRESH_REPLAY_NOT_RUN`

Therefore Phase 11 schema changes remain blocked until fresh replay evidence is obtained.
