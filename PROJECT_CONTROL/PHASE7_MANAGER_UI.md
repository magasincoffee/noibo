# Workforce V2 — Phase 7

## Scope

Phase 7 provides the OWNER / STORE_MANAGER operational UI for staffing demand and scheduler draft review.

## Included

- Workforce navigation entry for OWNER and STORE_MANAGER.
- Weekly staffing-demand view filtered through Supabase RPC/store scope.
- Create/update staffing requirement records through `upsert_workforce_staffing_requirement`.
- Weekly generation discovery through `list_schedule_generations`.
- Create a new DRAFT generation through `create_schedule_generation`.
- Inspect generation metadata and assignment rows through controlled RPCs.
- Mobile-friendly weekly navigation and review tables.

## Review boundary

The review screen is intentionally read-oriented in this phase. It does not mark a generation `REVIEWED` or `PUBLISHED`. Those state transitions require final validation/revalidation and the atomic publish transaction in the later workflow phase.

## Security boundary

The browser does not directly update `schedule_generation_runs`, `schedule_generation_assignments`, or `work_schedules`. Store scope remains enforced by Supabase RPCs.

## Runtime note

GitHub Pages and the target Supabase project still require runtime smoke testing before merge.
