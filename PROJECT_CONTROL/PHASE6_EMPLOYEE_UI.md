# Workforce V2 Phase 6 — Employee UI

## Scope

Employee-facing schedule and availability surface only.

## Included

- View official `APPROVED` schedules by week.
- Navigate previous/current/next scheduling week.
- View date-specific availability windows.
- Add multiple availability windows per day.
- Select `AVAILABLE`, `PREFERRED` or `UNAVAILABLE`.
- Select an optional preferred store.
- Delete the employee's own availability.
- Use controlled Supabase RPCs for availability writes and reads.

## Excluded

- Manager/OWNER schedule generation UI.
- Staffing-demand management UI.
- Review/reviewed/publish workflow.
- Direct mutation of `work_schedules`.
- Automatic publication.

## Runtime note

`web/workforce-ui.js` is loaded as an additive UI layer after the existing application shell. It intercepts only the employee `Lịch làm` navigation and uses the Phase 5 Supabase RPC/API contract.

Runtime smoke testing against the deployed GitHub Pages + Supabase environment remains required before merge.