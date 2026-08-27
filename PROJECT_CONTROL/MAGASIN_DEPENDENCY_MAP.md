# MAGASIN DEPENDENCY MAP

## Frontend shell — Apps Script current
`frontend/Index.html`
→ `_styles.html`
→ `_auth.html`
→ `_schedule.html`
→ `_attendance.html`
→ `_management.html`

## Frontend shell — GitHub target
`web/index.html`
→ `web/api-config.js`
→ `web/api.js`
→ `backend/16_API_Bridge.gs` via deployed Apps Script Web App URL

## Authentication/navigation
`_auth.html`
→ authentication/session functions
→ permission/role functions
→ page routing

`web/api.js`
→ login / session / logout HTTP actions

## Schedule
`_schedule.html`
→ `09_Lịch_làm_việc.gs`
→ `07_Phân_quyền.gs`
→ shared frontend helpers
→ attendance integration through scheduled shifts

`web/index.html` (migration target)
→ API actions exposed by `16_API_Bridge.gs`
→ canonical schedule backend `09_Lịch_làm_việc.gs`

## Attendance
`_attendance.html`
→ `10_Chấm_công.gs`
→ `09_Lịch_làm_việc.gs`

## Management
`_management.html`
→ `07_Phân_quyền.gs`
→ `08_Quản_lý_người_dùng.gs`
→ `09_Lịch_làm_việc.gs`

## Web entry point
`15_Ứng_dụng_web.gs`
→ `Index.html`
→ partial include mechanism

## HTTP API entry point
`16_API_Bridge.gs`
→ `doPost(e)`
→ explicit action dispatcher
→ session validation for protected actions
→ existing backend business functions

## Shared backend foundation
Most backend modules depend on `01_Cấu_hình_hệ_thống.gs` and `02_Nền_tảng_hệ_thống.gs`.

## Migration rule
`frontend/` remains the current Apps Script UI until `web/` completes functional and security smoke tests. `16_API_Bridge.gs` is additive and does not replace `15_Ứng_dụng_web.gs`.