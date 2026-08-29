# Workforce V2 — Merge Gate Checklist

Date: 2026-08-29
Branch: `workforce-v2-integration`
PR: #15

## PASS
- P0–P9 backend/runtime path verified on Supabase.
- Full E2E generation → validation → review → publish → attendance passed with cleanup.
- Publish revalidation conflict blocks publication and returns generation to DRAFT.
- Workforce RPCs denied to `anon`; direct authenticated writes to protected schedule/attendance tables denied.
- `schedule_generation_runs.updated_at` trigger/schema mismatch corrected additively.
- `set_updated_at()` search path pinned to `public`.
- P8 regression guard suite passes on production after validator restoration.
- Frontend Workforce JS syntax check passes in GitHub Actions.
- OWNER Workforce V2 route reaches the manager/OWNER UI.
- Manager staffing-demand screen loads without table-permission errors.
- Manager generation UX now loads ACTIVE stores independently from staffing requirements and blocks draft creation until a specific store is selected.

## OPEN GATES
1. GitHub Actions final integration-branch run must pass on the final PR head.
2. GitHub Pages browser smoke test must verify the current manager generation UX and employee schedule/availability + attendance paths.
3. Supabase migration metadata timestamps are documented against stable Git migration names; production history must not be rewritten blindly.
4. Legacy Security Advisor notices remain separate hardening work unless a new Workforce-critical regression is found.

## Security advisor classification
### Workforce-critical
- `set_updated_at` mutable search path: corrected.
- Workforce `SECURITY DEFINER` functions callable by authenticated users: intentional RPC boundary; server-side auth/role/store checks remain required.

### Legacy / separate hardening
- `can_access_store`, `current_user_access_scope`, `current_user_role`, approval helpers, `get_my_schedule`, `get_my_attendance`, `get_my_shift_swaps`, `resolve_login_email`, `handle_new_auth_user`, and related legacy SECURITY DEFINER warnings.
- Leaked-password protection disabled: recommended Auth hardening, not a Workforce runtime blocker.

### Performance-only
- Unindexed foreign keys and RLS init-plan warnings are performance/scale work, not current Workforce correctness blockers.

## Merge rule
Do not merge PR #15 while any OPEN GATE remains unresolved.
