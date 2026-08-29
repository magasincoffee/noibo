# Workforce V2 Phase 8 — validation / review / publish

Phase 8 adds the database gate for final validation, `REVIEWED`, and atomic publication into `work_schedules`.

## State lifecycle

```text
DRAFT
  ├─ review APPROVED + valid → REVIEWED
  ├─ review REJECTED          → CANCELLED
  └─ assignment edits remain DRAFT

REVIEWED
  └─ publish → final revalidation → PUBLISHED + work_schedules APPROVED
```

## Final validation

The server re-checks active employee status, store eligibility, availability, unavailable overlap, skill qualification, draft overlap, official schedule conflicts, daily/weekly hours, minimum rest across dates, mentor requirement, and staffing coverage by split time intervals.

## Atomic publication

`publish_schedule_generation()` locks the generation row, revalidates the draft, rejects official schedule conflicts, inserts `APPROVED` / `MANAGER_ASSIGNED` rows into `work_schedules`, and only then changes the generation status to `PUBLISHED`. Any SQL error aborts the transaction; failed validation/conflict returns the generation to `DRAFT` without partial publication.

The browser does not write `work_schedules` directly.
