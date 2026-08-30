# MAGASIN NOIBO — SHIFT SWAP BUSINESS LOGIC

Date: 2026-08-30
Status: Critical requirement for backend implementation

## Why this is important
This is a critical business rule to preserve while finishing the Manager and Owner UI. The final backend implementation should be done only after those role interfaces and approval flows are finalized.

## Example
- Employee A has an official Thursday shift: `06:00–12:00`.
- Employee B (for example Mai Chi) has an official Saturday shift: `12:00–17:00`.
- Employee A wants to exchange these two existing shifts with Employee B.

## Correct workflow
1. Employee selects one of their own official shifts.
2. Employee selects another employee as the swap partner.
3. The system shows that partner's existing official shifts that are eligible for swapping.
4. Employee selects the exact partner shift to exchange.
5. Employee submits a shift-swap request; the official schedule is not changed immediately.
6. The swap partner receives the request and can accept or reject it.
7. If accepted, the request proceeds to the required Manager/Owner approval stage.
8. Only after required approval is completed should the system perform the official schedule ownership swap atomically.

## Constraints
- The UI must not allow employees to manually invent arbitrary dates/times as a replacement shift.
- A swap exchanges existing official assignments; it is not schedule creation.
- Validate store scope, employee eligibility, overlap/conflict rules, and other Workforce scheduling constraints before finalization.
- In the example, `06:00–12:00` is 6 hours and `12:00–17:00` is 5 hours. The UI/backend must make clear that the exchange changes scheduled hours and may affect attendance, pay, and KPI calculations.
- Reuse the existing Workforce V2 approval/swap architecture; do not directly mutate official schedules from the browser.

## Backend sequencing
Do not implement the final Shift Swap backend solely from the Employee prototype. Finish the **Manager UI** and **Owner UI** first, then design/implement the backend end-to-end against the finalized role UX and approval flow.

## Next UI task
**THỰC HIỆN PHẦN GIAO DIỆN CỦA MANAGER.**
