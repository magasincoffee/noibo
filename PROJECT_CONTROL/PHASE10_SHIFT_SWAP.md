# Workforce V2 Phase 10 — Shift Swap

## Scope
Integrate employee shift-swap requests directly with authoritative approved `work_schedules` and an OWNER / STORE_MANAGER approval workflow.

## Canonical state

```text
PENDING
  ├─ requester cancels → CANCELLED
  ├─ manager rejects   → REJECTED
  └─ manager approves after revalidation → APPROVED
```

## Source of truth
A new request stores:
- `requester_schedule_id`
- `target_schedule_id`
- `target_user_id`

`current_shift` / `requested_shift` remain human-readable snapshots only. The authoritative schedule rows are `work_schedules`.

## Approval rules V1
- Both schedules must be `APPROVED`.
- Requester must own the requester schedule.
- Employees must be different, active, same store and same work date.
- No non-deleted attendance may exist on either schedule.
- Both employees must be available for the other employee's interval.
- Resulting official schedules must not overlap another official schedule for either employee.
- Daily and weekly hour caps are revalidated before submission and again immediately before approval.
- Approval locks both schedule rows in deterministic UUID order.
- Approval swaps only `work_schedules.user_id`; it never rewrites attendance history.

## Security boundary
- Browser cannot insert/update/delete `shift_swaps` directly.
- All Phase 10 writes go through RPCs.
- Phase 10 RPCs are executable by `authenticated` only.
- Internal validator is not executable by browser roles.

## RPC contract
- `list_my_approved_schedules_v1()`
- `list_shift_swap_candidates_v1(uuid)`
- `submit_shift_swap_request(uuid, uuid, text)`
- `list_my_shift_swaps_v2()`
- `list_shift_swap_requests_v1(uuid, text)`
- `approve_shift_swap(uuid)`
- `reject_shift_swap(uuid, text)`
- `cancel_shift_swap(uuid)`

## Runtime verification
- CI: scheduler + frontend syntax + regression fixture all pass.
- Production E2E: request → approve → ownership swap passed inside rollback transaction.
- Negative auth cases for submit/approve/cancel return `AUTH_REQUIRED`.
- Production `shift_swaps` test rows are zero after rollback.

## Remaining gate
Deploy `phase10-shift-swap` to GitHub Pages and perform browser smoke testing as an authenticated STAFF and OWNER/STORE_MANAGER account before merging PR #16.
