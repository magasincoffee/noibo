# MAGASIN Lịch làm V1 — Runtime

## Runnable page
`web/schedule.html`

The page is a standalone official-schedule viewer connected to the production Supabase project through the existing public publishable browser configuration.

## Behavior
- Authenticated users only.
- STAFF/Employee calls `list_my_approved_schedules_v2(p_week_start)`.
- OWNER/STORE_MANAGER calls `get_manager_weekly_schedule(p_store_id, p_week_start)`.
- Official active schedule is `APPROVED` only.
- Week is Monday-Sunday using `Asia/Ho_Chi_Minh` business semantics.
- Manager can filter by active store.
- Clicking a schedule opens read-only details.
- No edit/delete/publish actions exist in Lịch làm.
- Attendance navigation is read-only navigation to the existing app.

## Color contract
- 06:00–14:00: yellow
- 12:00–17:00: red
- 14:00–22:00: cyan
- Neutral/strikethrough registration state is not an official schedule state.

## Data flow
`Workforce → Review → Publish → work_schedules(APPROVED) → Lịch làm → Chấm công`

## Runtime status
- Supabase RPCs are deployed and callable.
- Current database has 0 rows in `work_schedules`, so an authenticated viewer with no published schedules should see `Không có ca`.
- Unauthenticated direct execution of the Manager RPC is rejected with `AUTH_REQUIRED`, confirming the auth boundary at the function entry point.

## Next integration
The next production integration should replace the existing app's Employee schedule renderer with the V2 read contract and add the same official schedule reader into the Manager shell. The standalone page is intentionally usable as a safe runtime checkpoint while the protected main app remains on its existing branch/CI gate.
