# MAGASIN — Schedule Read V1 Production Smoke Matrix

## Purpose

Post-merge verification for the official **Lịch làm → Chấm công** boundary.

The authoritative official schedule remains:

`public.work_schedules` where `status = 'APPROVED'`.

Business timezone: `Asia/Ho_Chi_Minh`.
Business week: Monday → Sunday.

## Precondition

Use a controlled test fixture that is rolled back after validation:

`Registration → Review → Publish → APPROVED schedule → Lịch làm → Attendance`

Do not leave persistent test schedules in production.

## Employee smoke

Expected role: `STAFF`.

1. Open **Lịch làm**.
2. The UI calls `list_my_approved_schedules_v2`.
3. Only the authenticated employee's `APPROVED` schedules are visible.
4. Clicking a shift opens read-only details.
5. No edit, delete, or publish action is available.
6. Navigate to **Chấm công** and clock in using the approved `schedule_id`.
7. Clock out and verify the same `schedule_id` remains linked.

Expected security result:

- `get_manager_weekly_schedule` → rejected with `ROLE_NOT_ALLOWED`.

## Store Manager smoke

Expected role: `STORE_MANAGER`.

1. Open **Lịch làm**.
2. The UI calls `get_manager_weekly_schedule`.
3. Only stores inside `can_access_store` scope are readable.
4. Clicking a shift is read-only.
5. Verify CN1 access succeeds when CN1 is in scope.
6. Verify an out-of-scope store is rejected with `STORE_NOT_ALLOWED`.
7. Verify there is no edit/delete/publish action on Lịch làm.

## Owner smoke

Expected role: `OWNER`.

1. Open **Lịch làm**.
2. Read the permitted store scope through `get_manager_weekly_schedule`.
3. Verify approved schedules display correctly.
4. Verify shift details are read-only.
5. Verify Attendance linkage opens without changing schedule data.

## Attendance boundary

For an approved schedule:

1. `clock_in_for_schedule(schedule_id)` creates attendance linked to the same `schedule_id`.
2. `clock_out_attendance(attendance_id)` completes the attendance.
3. The attendance record must preserve the originating `schedule_id`.

## CI gate

The required Workforce V2 CI must cover:

- scheduler checks/tests
- Workforce frontend syntax, including `schedule-ui-v2.js`
- existing review/publish regression guard
- controlled publish → schedule read → attendance linkage regression fixture

## Pass criteria

The release candidate passes this matrix only when:

- Employee boundary passes
- Manager scope boundary passes
- Owner boundary passes
- Attendance linkage passes
- required CI checks are green
- no persistent controlled fixture remains
