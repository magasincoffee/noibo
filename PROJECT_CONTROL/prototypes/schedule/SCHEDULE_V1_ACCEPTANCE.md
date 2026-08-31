# Lịch làm V1 — Acceptance Checklist

## Locked behavior
- Official schedule source: `work_schedules`.
- Active official rows: `APPROVED` only.
- Business week: Monday → Sunday.
- Manager: only within authorized store scope.
- Manager click on a schedule: read-only detail.
- No edit/delete/publish from Lịch làm.
- Attendance navigation is read-only navigation into the existing attendance module.
- Shift colors: 06:00–14:00 yellow; 12:00–17:00 red; 14:00–22:00 cyan.

## Runtime checkpoint
`web/schedule.html` is the current runnable checkpoint against Supabase.

## Integrated-shell checkpoint
`web/schedule-ui.js` contains the shell integration layer. Its loader change is intentionally isolated from the legacy app.js so unrelated behavior is not replaced.

## Backend checkpoint
`get_manager_weekly_schedule` and `list_my_approved_schedules_v2` are deployed.

## Data test condition
The current environment has no `work_schedules` rows. To validate a visible real shift, publish a valid schedule through the existing Workforce publish workflow, then reload Lịch làm.
