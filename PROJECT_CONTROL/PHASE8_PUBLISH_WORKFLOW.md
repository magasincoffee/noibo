# Workforce V2 Phase 8 — validation / review / publish

Phase 8 adds the database gate for final validation, `REVIEWED`, and atomic publication into `work_schedules`.

Publish rules:
- only OWNER / STORE_MANAGER with store scope may act;
- generation must be DRAFT for review or publish;
- final validation runs inside the same transaction as publish;
- hard violations block publication;
- official `work_schedules` rows are not silently deleted;
- rows that conflict with the generation week/store/employee are not overwritten; publication fails instead;
- published assignments become `APPROVED` official schedules with `origin = MANAGER_ASSIGNED`;
- concurrent publish is blocked with row locking and status checks;
- repeated publish of an already PUBLISHED generation is rejected.

The Node scheduler remains the generation engine. Supabase is the authoritative validation and publication boundary.