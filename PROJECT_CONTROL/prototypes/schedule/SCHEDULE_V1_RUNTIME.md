# MAGASIN — Lịch làm V1 — Runtime

## Runnable product
- `web/schedule.html` is a standalone official-schedule viewer connected to Supabase.
- `web/schedule-ui.js` is loaded by `web/supabase-config.js` and integrates the official reader into the authenticated application shell.

## Behavior
- Authenticated users only.
- STAFF/Employee calls `list_my_approved_schedules_v2(p_week_start)`.
- OWNER/STORE_MANAGER calls `get_manager_weekly_schedule(p_store_id, p_week_start)`.
- Official active schedule is `APPROVED` only.
- Week is Monday-Sunday using `Asia/Ho_Chi_Minh` business semantics.
- Manager can filter by active store.
- Clicking a schedule opens read-only details.
- No edit/delete/publish actions exist in Lịch làm.
- Attendance navigation remains read-only navigation to the existing attendance module.

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
- Main-shell loader integration is complete on `feat/schedule-read-v1`: `supabase-config.js` now loads `schedule-ui.js` alongside the Workforce/Attendance modules.

## Production integration rule
The Schedule module does not write `work_schedules`. Workforce Publish remains the only path that materializes the official schedule. Lịch làm is a read-only consumer of official schedule state.
