# Employee UI v21 checkpoint

## Approved UI changes
- Employee role is treated as a separate production-style interface; Manager/Owner are not shown as role-switch buttons inside Employee UI.
- Header shows only the currently selected section name, plus notification, employee name and rank, and avatar.
- Sidebar opens from the left as an overlay when the hamburger button is pressed.
- Sidebar is not part of the page layout, so content can use the full viewport width when closed.
- Header identity: **Trắng** / **Cấp 2 · Nhân viên** in this prototype.
- The circular avatar area opens an image picker for immediate preview.
- Employee dashboard focuses on: Today, today's tasks, next-week schedule registration, Academy, and capability/career path.
- When a part-time employee has no shift, Today and Tasks remain visible and use explicit empty states instead of disappearing.
- Schedule registration is available directly from the dashboard during Thursday–Saturday, for the following week.
- Time inputs use 24-hour time with a global 30-minute step.
- Shift exchange starts by choosing **Đổi ca** or **Cho ca**; only the relevant form appears.
- Shift-exchange history supports date-range lookup and period presets such as this week, this month, previous week, previous month, and all.

## Current prototype artifact
Local review artifact: `magasin_noibo_employee_v21.html`

This checkpoint is a design/UX record only; no backend behavior is implemented by this document.