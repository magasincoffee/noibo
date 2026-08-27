# MAGASIN DEPENDENCY MAP

## Frontend shell
`Index.html`
→ `_styles.html`
→ `_auth.html`
→ `_schedule.html`
→ `_attendance.html`
→ `_management.html`

## Authentication/navigation
`_auth.html`
→ authentication/session functions
→ permission/role functions
→ page routing

## Schedule
`_schedule.html`
→ `09_Lịch_làm_việc.gs`
→ `07_Phân_quyền.gs`
→ shared frontend helpers
→ attendance integration through scheduled shifts

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

## Shared backend foundation
Most backend modules depend on `01_Cấu_hình_hệ_thống.gs` and `02_Nền_tảng_hệ_thống.gs`.