# MAGASIN NOIBO — EMPLOYEE UI VISUAL ARCHITECTURE GUIDE

Date: 2026-08-30
Status: APPROVED DESIGN DIRECTION
Scope: Visual/UI refinement only. Business logic, information architecture, layout decisions and approved workflows remain unchanged.

## 1. Purpose

This document freezes the approved visual direction for the Employee prototype after UI review. It is a visual layer to be applied consistently across Employee screens before production integration.

The purpose is to make Employee feel like one coherent internal SaaS/HR product rather than a collection of individually styled prototype cards.

## 2. Non-negotiable product constraints

Do NOT change these while applying visual refinement:

- Employee Dashboard remains three tiers:
  1. `Hôm nay` | `Công việc hôm nay`
  2. `KPI tháng này` | `Academy`
  3. `Đăng ký lịch làm tuần tới` full-width
- KPI dashboard cards remain `KPI cá nhân` + `KPI cửa hàng` and show compact percentage/status summaries; details open the corresponding detail view.
- Personal KPI detail must expose unmet targets, missing work, violations/incidents and Academy gaps.
- Store KPI detail compares actual results with explicit targets.
- Attendance keeps date-range reporting and summaries for total shifts, total hours, total pay and average pay/hour.
- Settings password change remains collapsed by default.
- Notification remains in the Header bell; no duplicate `Thông báo` sidebar item.
- Official schedule and schedule-registration previews keep the approved shift color convention:
  - Yellow: morning family, `06:00–14:00`
  - Red: midday/afternoon family, `12:00–17:00`
  - Cyan: afternoon/evening family, `14:00–22:00`
- Weekly schedule registration remains a separate card with its expandable arrow/form preserved.
- Shift Swap business logic is unchanged and must not be simplified by UI changes: swap existing official assignments; partner selects/accepts; Manager/Owner approval; atomic ownership swap; validate eligibility, scope, overlap/conflicts; explain unequal hours and potential pay/KPI impact.
- Production backend implementation is deferred until Manager and Owner UI are finalized.

## 3. Visual direction

Style: Clean SaaS + Soft UI + Enterprise.

Characteristics:

- Light blue-gray application background.
- White surfaces/cards.
- Thin neutral borders.
- Very restrained shadows.
- Moderate, consistent corner radius.
- Clear typography hierarchy.
- Cyan/blue for primary actions; status/shift colors retain their defined semantic meaning.
- Use whitespace and borders for normal grouping; reserve stronger elevation for overlays, menus and modals.

Avoid:

- Heavy shadows on every card.
- Excessive rounded pills.
- Too many saturated background colors.
- Making every label bold.
- Introducing decorative UI that competes with work information.

## 4. Typography

Preferred typeface: `Inter`.

Recommended weights: 400, 500, 600, 700.

Reference hierarchy:

- Page title: 28px / 700
- Card title: 20px / 700
- Section title: 16px / 600
- Body: 15px / 400
- Secondary text: 14px / 400
- Badge: 12px / 600
- KPI emphasis: 30–36px / 700
- Money / key hours: 24–28px / 700

Do not make all text bold. Bold is for hierarchy and emphasis, not default styling.

## 5. Spacing system

Use an 8px-based spacing scale:

`4, 8, 12, 16, 24, 32, 40, 48`

Recommended defaults:

- Page padding: 24px
- Card padding: 24px
- Card-to-card gap: 16px
- Title to description: 8px
- Description to content: 16px
- Major section separation: 24px

## 6. Radius and elevation

Corner radius:

- Page container: 20px
- Card: 16px
- Inner card: 12px
- Button: 10px
- Input: 10px
- Badge/pill: 999px

Elevation:

- Level 0: normal cards use border and little/no shadow.
- Level 1: interactive cards and selected surfaces use a light shadow around `0 2px 8px`.
- Level 2: modal/dropdown/overlay use a stronger shadow around `0 8px 24px`.

Do not use Level 2 elevation for normal content cards.

## 7. Surface and color tokens

Base visual tokens should be centralized rather than set ad hoc per page.

Example token groups:

```css
--color-brand
--color-primary
--color-text
--color-text-muted
--color-border
--color-surface
--color-background

--radius-sm
--radius-md
--radius-lg

--shadow-sm
--shadow-md
--shadow-lg

--space-1
--space-2
--space-3
--space-4
--space-6
--space-8

--font-body
--font-heading
```

## 8. Header

Keep current information architecture:

- Hamburger/menu control.
- Page title.
- Header notification bell.
- Employee name + level.
- Avatar.

Visual refinement:

- Approximately 72px high.
- White background.
- Subtle bottom border.
- Page title should read as a title, not as an oversized decorative chip.
- Avatar remains circular.
- Bell remains in Header only.

## 9. Sidebar

Keep the current Employee menu structure.

Visual refinement:

- Active item: light blue background + blue text + small left accent.
- Inactive item: transparent/neutral.
- Hover: light blue surface.
- Reduce heavy fills and large visual weight.

Do not reintroduce `Thông báo` into the sidebar.

## 10. Dashboard modules

### Hôm nay

Use clear shift emphasis and quick actions. Shift color communicates the shift family; primary action buttons use the product primary color instead of the shift color.

### Công việc hôm nay

Use a lightweight task/checklist pattern:

- Completed: subtle green treatment.
- Pending: neutral treatment.
- Overdue/problem: restrained red warning treatment.

### KPI tháng này

Keep two inner KPI cards evenly split. The dashboard summary is intentionally compact; detailed analysis belongs in the KPI detail views.

Avoid oversized rings that consume too much dashboard space.

### Academy

Treat Academy as a learning-progress module rather than a marketing block:

- Current level.
- Overall progress.
- Key required modules.
- Development modules.
- `Xem Academy` action.

### Đăng ký lịch tuần tới

Remain full-width on Dashboard, visually separated from the official schedule concepts and retain the expandable registration behavior.

## 11. Schedule visual rules

The same schedule color convention must be used everywhere schedule information appears.

### Yellow family

`06:00–14:00` and morning-family examples such as `05:00–08:00`, `06:00–10:00`, `06:00–12:00`, `09:00–13:00`.

Suggested visual:

- Background: `#FFF9D8`
- Border: `#F0E6A3`
- Text: `#725F00`

### Red family

`12:00–17:00` and midday-family examples such as `12:00–14:00`.

Suggested visual:

- Background: `#FBE4E4`
- Border: `#EDBABA`
- Text: `#9A3838`

### Cyan family

`14:00–22:00` and afternoon/evening examples such as `14:00–18:00`, `16:00–22:00`, `17:00–22:00`.

Suggested visual:

- Background: `#DDF8F8`
- Border: `#A3DFDF`
- Text: `#08777A`

Use saturated colors primarily for indicators/accent lines/selected states, not large page backgrounds.

## 12. Attendance

Keep the existing business logic. Refine the summary into four compact metrics:

- Tổng ca
- Tổng giờ
- Tổng tiền
- TB / giờ

Then show the selected date-range history.

## 13. KPI detail

Personal KPI detail should be visually organized into:

- Achieved targets.
- Needs improvement.
- Violations/incidents.
- Missing work.
- Academy gaps.

Store KPI detail should show `Thực tế` vs `Mục tiêu` and the resulting percentage/status.

When a percentage is interactive, use a modal/detail surface to explain the calculation rather than forcing another page hop where unnecessary.

## 14. Shift Swap visual rule

The UI must represent an exchange of two existing official assignments, not free-form schedule creation.

Pattern:

`Ca của tôi` → `Chọn nhân viên` → `Chọn ca chính thức của nhân viên` → `Review` → `Gửi yêu cầu`

If scheduled hours differ, explicitly show the difference (e.g. `6 giờ ↔ 5 giờ`) and a warning that attendance/pay/KPI may be affected.

Do not allow arbitrary replacement date/time creation from the Employee swap UI.

## 15. Buttons and inputs

Primary button:

- Primary product cyan.
- 40–44px height.
- 10px radius.
- 600 weight.

Secondary button:

- Very light neutral/blue surface.
- Dark text.

Inputs:

- 42–44px height.
- 10px radius.
- Thin neutral border.
- Clear focus ring in product primary color.

## 16. Modal/overlay

Use stronger elevation only for true overlay surfaces:

- Backdrop: subdued dark translucent layer.
- Modal: white, 18px radius, 24px padding, Level 2 shadow.

Use modals for drill-down information such as KPI calculation/detail where that interaction is more efficient than a full page.

## 17. Implementation order for UI refinement

1. Visual foundation: typography, spacing, radius, border, shadow, centralized color tokens.
2. Shell: Header + Sidebar + page container.
3. Dashboard: Hôm nay + Công việc + KPI + Academy + registration.
4. Functional screens: Lịch làm + Chấm công + Đổi ca + KPI detail + Academy.
5. States: hover, active, success, warning, error, disabled, loading.

## 18. Design research references

This direction was informed by current design-system guidance reviewed during the Employee UI refinement discussion:

- Atlassian Design System — Foundations: https://atlassian.design/foundations
- Atlassian — Spacing: https://atlassian.design/foundations/spacing
- Atlassian — Elevation: https://atlassian.design/foundations/elevation
- Atlassian — Typography: https://atlassian.design/foundations/typography
- Atlassian — Design Tokens: https://atlassian.design/foundations/tokens/design-tokens/
- Ant Design — Shadow: https://ant.design/docs/spec/shadow/
- shadcn/ui — Card component: https://ui.shadcn.com/docs/components/base/card

These references are design-system inspiration, not dependencies of the application. The MAGASIN visual token values above are project-level decisions.

## 19. Architecture boundary

This document governs UI/visual refinement of the Employee prototype only.

It does not replace the canonical production Workforce implementation under `web/`.

Final production/backend implementation remains sequenced after:

1. Employee UI checkpoint.
2. Manager UI completion.
3. Owner UI completion.
4. Backend design/revalidation against the finalized role UX and approval flow.
