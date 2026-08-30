# MAGASIN NOIBO — EMPLOYEE PROTOTYPE STATUS

Date: 2026-08-30

## Current checkpoint

The approved Employee prototype is frozen at **v38** for the current UI review cycle.

The standalone HTML prototype is maintained in the conversation as the visual working artifact until the next approved revision. This checkpoint records the approved decisions so future work can resume without losing context.

## Approved Employee dashboard layout

1. Tier 1: `Hôm nay` | `Công việc hôm nay` — equal two-column layout.
2. Tier 2: `KPI tháng này` | `Academy` — equal two-column layout.
3. Tier 3: `Đăng ký lịch làm tuần tới` — full-width card.
4. KPI cards inside the KPI module are evenly split.

## Approved Employee navigation

- `Thông báo` is removed from the sidebar.
- Notification access remains in the Header bell.
- `Đổi mật khẩu` in Settings is collapsed by default and expands only when selected.

## Approved KPI behavior

### Dashboard summary
- `KPI cá nhân` and `KPI cửa hàng` show only the percentage achieved and a compact status.
- Selecting `Xem chi tiết` opens the corresponding detailed KPI view.
- KPI personal detail must surface unmet targets, missing work, violations/incidents and Academy gaps so the employee can understand what needs attention.
- KPI store detail compares actual results against explicit targets (for example revenue actual/target and order actual/target).
- The KPI figures in the prototype are mock data only.

## Approved Attendance behavior

- Attendance includes a date-range report (`Từ ngày` → `Đến ngày`).
- Summary shows total shifts, total hours, total pay and average pay/hour.
- Employee can see how much they have earned within the selected month/range.

## Approved schedule color convention

- **Yellow:** morning family, `06:00–14:00`.
- **Red:** midday/afternoon family, `12:00–17:00`.
- **Cyan:** afternoon/evening family, `14:00–22:00`.
- The same color convention is used by both official schedules and the weekly schedule-registration preview.

## Approved schedule registration behavior

- `Đăng ký lịch làm tuần tiếp theo` is separated from the official weekly schedule into its own card.
- The expandable section and arrow remain intact.
- Registration preview shift cards use the same shift-color convention as the official schedule.

## Next project task

**NEXT: THỰC HIỆN PHẦN GIAO DIỆN CỦA MANAGER.**

This is the next UI/prototype work item after the Employee prototype checkpoint is accepted.

## Scope boundary

This checkpoint is for **prototype/UI work**, not production Workforce backend integration. Do not treat the standalone prototype as a replacement for the canonical `web/` application.
