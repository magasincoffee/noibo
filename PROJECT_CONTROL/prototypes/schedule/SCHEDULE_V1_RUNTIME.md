# MAGASIN — Lịch làm V1 — Runtime

## Runnable product
- `web/schedule.html` is a standalone official-schedule viewer connected to Supabase.
- `web/schedule-ui.js` contains the official reader integrated into the authenticated app shell.

## Behavior
- Authenticated users only.
- STAFF/Employee calls `list_my_approved_schedules_v2(p_week_start)`.
- OWNER/STORE_MANAGER calls `get_manager_weekly_schedule(p_store_id, p_week_start)`.
- Official active schedule is `APPROVED` only.
- Week is Monday-Sunday using `Asia/Ho_Chi_Minh` business semantics.
- Manager can filter by active store.
- Clicking a schedule opens read-only details.
- No edit/delete/publish actions exist in Lịch làm.
- Attendance navigation is read-only navigation to the existing attendance module.

## Color contract
- 06:00–14:00: yellow
- 12:00–17:00: red
- 14:00–22:00: cyan
- Neutral/strikethrough registration state is not an official schedule state.

## Data flow
`Workforce → Review → Publish → work_schedules(APPROVED) → Lịch làm → Chấm công`

## Runtime status
- Supabase RPCs are deployed.
- `work_schedules` currently has 0 rows in the inspected environment, so the reader correctly renders `Không có ca` until a schedule is published.
- Unauthenticated direct execution of the Manager RPC is rejected with `AUTH_REQUIRED`.

## Main-shell integration
- `schedule-ui.js` is committed on `feat/schedule-read-v1`.
- The module is isolated so it can replace the legacy `schedule()` rendering without rewriting unrelated app behavior.
- The main-shell loader change is intentionally kept as a separate protected-branch integration step.
