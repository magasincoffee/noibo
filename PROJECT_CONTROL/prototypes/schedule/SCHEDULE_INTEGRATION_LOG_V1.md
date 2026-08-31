# Schedule Integration Log V1

## Current state
The real Schedule reader exists as `web/schedule.html` and `web/schedule-ui.js`.
The standalone reader is runtime-connected to Supabase and uses the deployed V2 read RPCs.

## Main-shell integration
The existing `web/app.js` is protected by the repository workflow. To avoid replacing unrelated application code, the Schedule module is kept isolated in `web/schedule-ui.js` and is intended to be loaded by `web/supabase-config.js` alongside the existing domain modules.

## Contract
- Employee: `list_my_approved_schedules_v2`
- Manager/Owner: `get_manager_weekly_schedule`
- Official rows only: `APPROVED`
- Manager click: read-only
- Attendance: navigation only

## Safety
No official schedule is mutated by the Schedule UI. Workforce remains the only schedule editing/review/publish surface.
