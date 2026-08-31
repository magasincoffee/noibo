# MAGASIN — Official Schedule Read API V1

## Status
Implemented in Supabase migration `20260831000100_schedule_read_api_v1`.

## Source of truth
`public.work_schedules` is the authoritative source for the official schedule.
A schedule is displayed as active official schedule only when `status = 'APPROVED'`.

## Week semantics
- Business timezone: `Asia/Ho_Chi_Minh`
- Week: Monday → Sunday
- `week_start` must be Monday
- When omitted, the RPC derives the current Monday using the business timezone
- V1 does not support overnight shifts; the database already requires `end_time > start_time`

## Employee RPC
`list_my_approved_schedules_v2(p_week_start date default null)`

Returns:
- `schedule_id`
- `work_date`
- `start_time`
- `end_time`
- `store_id`
- `store_code`
- `store_name`
- `status`
- `origin`

Authorization:
- authenticated users only
- caller sees own schedules only
- `APPROVED` rows only

The existing `get_my_schedule()` is retained for backwards compatibility.

## Manager RPC
`get_manager_weekly_schedule(p_store_id uuid default null, p_week_start date default null)`

Returns:
- `schedule_id`
- `work_date`
- `start_time`
- `end_time`
- `store_id`
- `store_code`
- `store_name`
- `user_id`
- `employee_name`
- `status`
- `origin`

Authorization:
- `OWNER` can read stores allowed by the global role boundary
- `STORE_MANAGER` can read only stores allowed by `can_access_store`
- optional `p_store_id` is rejected with `STORE_NOT_ALLOWED` when outside scope
- `APPROVED` rows only

## UI contract
### Employee
Official schedule viewer. No direct schedule edit.

### Manager
Official schedule viewer inside manager scope. Clicking a shift opens read-only details:
- employee
- work date
- start/end
- actual store
- official/home branch when the UI has that relationship available
- official status
- link to Attendance

There is no edit/delete/publish action on the Lịch làm screen.

## Workflow boundary
```text
Availability
  ↓
Workforce demand
  ↓
Registration / Draft
  ↓
Manager review
  ↓
Final validation
  ↓
Publish
  ↓
work_schedules (APPROVED)
  ↓
Lịch làm
  ↓
Attendance
```

Manager schedule editing remains in Workforce before publication. Lịch làm is read-only.

## Security
Both functions are `SECURITY DEFINER`, pin `search_path = public`, require authenticated callers, and revoke execute from `anon` and `public`.

## Implementation note
No schema change was made to `work_schedules` in this step. The migration adds only read RPCs and comments/grants.
