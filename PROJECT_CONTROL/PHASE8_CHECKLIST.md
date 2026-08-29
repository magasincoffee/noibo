# Workforce V2 Phase 8 — checkpoint

## Implemented
- Server-side final validation RPC: `validate_schedule_generation_v1`.
- Controlled review RPC: `review_schedule_generation`.
- Controlled publication RPC: `publish_schedule_generation`.
- Review lifecycle: `DRAFT -> REVIEWED` after validation; rejected draft becomes `CANCELLED`.
- Publish lifecycle: `REVIEWED -> PUBLISHED` only after final revalidation.
- Publication creates `APPROVED` / `MANAGER_ASSIGNED` rows in `work_schedules`.
- Official schedule overlap blocks publication.
- Failed revalidation/conflict returns generation to `DRAFT` without partial official writes.
- Generation row locking prevents concurrent review/publish races.

## Verified by source review
- Authenticated-only execute grants.
- OWNER / STORE_MANAGER role gate.
- STORE_MANAGER store-scope gate.
- No direct browser write to `work_schedules`.
- No overnight shift behavior introduced.
- Coverage checked on split time boundaries.
- Minimum and maximum coverage are hard blocks; target shortfall is warning-only.

## Runtime verification required
- Apply migrations to target Supabase project.
- Execute positive and negative RPC cases with real roles and stores.
- Verify rollback when a publish insert/update fails.
- Verify concurrent publish behavior.
- Verify deployed GitHub Pages manager actions against the new RPCs.
