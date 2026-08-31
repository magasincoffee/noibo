# MAGASIN — Lịch làm Implementation Status V1

## Completed

### UI / product decisions
- Employee Lịch làm is official schedule viewer based on locked Employee V40 visual language.
- Manager Lịch làm is official schedule viewer within authorized scope.
- Manager clicking a schedule card is read-only; no edit/delete/publish actions on this screen.
- Editing/reviewing remains in Workforce before Publish.
- Official flow: Workforce → Review → Publish → `work_schedules` (`APPROVED`) → Lịch làm → Chấm công.
- Shift colors are shared: 06:00–14:00 yellow; 12:00–17:00 red; 14:00–22:00 cyan.

### Backend
Migration implemented in Supabase and mirrored in GitHub:
`supabase/migrations/20260831000100_schedule_read_api_v1.sql`

Added RPCs:
- `get_manager_weekly_schedule(p_store_id, p_week_start)`
- `list_my_approved_schedules_v2(p_week_start)`

The Manager RPC enforces OWNER / STORE_MANAGER role and store scope using `can_access_store`, and returns only `APPROVED` schedules for a Monday-Sunday week.
The Employee V2 RPC returns only the caller's `APPROVED` schedules and exposes the authoritative `schedule_id`.

### Web integration
- `web/schedule-ui.js` is loaded by the authenticated app shell through `web/supabase-config.js`.
- The legacy standalone `web/schedule.html` remains as a safe runtime checkpoint.
- The integrated module renders the current official schedule directly from Supabase, supports weekly navigation, Manager/Owner store filtering, shared shift colors, read-only detail modal and Attendance navigation.
- The module no longer assumes a `home_store_code` field that is not present in the read RPC contract.

### Verification
Supabase runtime confirmed both functions exist as `SECURITY DEFINER STABLE` with the expected signatures and return shapes.
The production database currently has four active stores and the current official `work_schedules` table contains zero rows in the inspected environment, so data-path result counts are currently zero rather than a failed read.
The latest Workforce V2 CI run for this branch completed successfully before the latest UI-only commit; the latest commit should be rechecked by CI before merge.

## Not changed
- No `work_schedules` schema change.
- No attendance schema change.
- No publish behavior change.
- No direct Manager schedule mutation from Lịch làm.

## Remaining validation
1. Re-run CI on the latest branch commit.
2. Validate Manager scope with real Manager test identities for CN1/CN2 and Owner.
3. Validate Employee V40 against `list_my_approved_schedules_v2`.
4. Create or use a real approved schedule fixture in a controlled test environment and run Publish → official schedule → Lịch làm → Attendance.

## Current readiness
Schedule read architecture and web integration are implemented. The remaining blocker to declaring full end-to-end production readiness is test data / authorized runtime identities for a published `APPROVED` schedule and final protected-branch merge validation.
