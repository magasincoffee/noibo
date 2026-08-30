# DECISION-UI-002 — Global Time Step

**Status:** APPROVED  
**Date:** 2026-08-30  
**Scope:** Entire MAGASIN NOIBO project

## Decision

All user-facing time selection/input controls in MAGASIN NOIBO use a **24-hour clock with a fixed 30-minute step**.

Allowed values are:

```text
00:00
00:30
01:00
01:30
...
23:00
23:30
```

Values such as `07:05`, `08:15`, `09:45`, `23:55` are not valid for standard time-selection controls.

## Applies to

- Employee schedule registration
- Official schedules
- Attendance check-in / check-out
- Manager scheduling and draft scheduling
- Shift swap time selection
- Inventory workflows when a time field is required
- Future modules that introduce standard time selection

## UI rule

Use Vietnamese labels and the 24-hour format. Do not use `SA/CH` or AM/PM.

Example:

```text
Bắt đầu: 09:00
Kết thúc: 13:00
```

## Implementation rule

The same rule must be enforced at both UI and backend validation layers when time fields are persisted. A UI-only restriction is not sufficient.

## Historical context

The rule was confirmed after a prototype still exposed five-minute values such as `07:05`. This decision records the corrected global rule so future prototypes and production screens do not reintroduce smaller time increments.

## Working agreement

Whenever the user explicitly says a project rule is **chốt / approved**, record it in `docs/decisions/` (or the closest project-control document) and update the relevant prototype/documentation in GitHub before moving on to dependent implementation work.
