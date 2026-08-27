# MAGASIN DEPENDENCY MAP

## Production runtime
`15_Ứng_dụng_web.gs`
→ `?source=github`
→ `18_GitHub_Frontend_Loader.gs`
→ GitHub `main/frontend/*`
→ HtmlService
→ `google.script.run`
→ backend business modules
→ Google Sheets

## Frontend shell
`frontend/Index.html`
→ `_styles.html`
→ `_auth.html`
→ `_schedule.html`
→ `_attendance.html`
→ `_management.html`

## Authentication / session / role
`_auth.html`
→ `03_Đăng_nhập_xác_thực.gs`
→ `04_Khôi_phục_mật_khẩu.gs`
→ `05_Phiên_đăng_nhập.gs`
→ `06_Hồ_sơ_nhân_viên.gs`
→ `07_Phân_quyền.gs`
→ `08_Quản_lý_người_dùng.gs`

`05_Phiên_đăng_nhập.gs`
→ `findUserRowByUsername_()` from module 06
→ current `Người dùng` Sheet
→ refresh role/status/accessScope for live session validation

`07_Phân_quyền.gs`
→ canonical page permission list
→ canonical capability list
→ manager/store scope guard

## Schedule
`_schedule.html`
→ `09_Lịch_làm_việc.gs`
→ `07_Phân_quyền.gs`
→ `10_Chấm_công.gs` for planned-shift integration

## Attendance
`_attendance.html`
→ `10_Chấm_công.gs`
→ `09_Lịch_làm_việc.gs`

## Management
`_management.html`
→ `07_Phân_quyền.gs`
→ `08_Quản_lý_người_dùng.gs`
→ `09_Lịch_làm_việc.gs`

## Employee profile
`_auth.html`
→ `06_Hồ_sơ_nhân_viên.gs`
→ `05_Phiên_đăng_nhập.gs`

## Shift swap
`_auth.html`
→ `11_Đổi_ca.gs`

Current limitation: module 11 supports employee submit/read only; manager approval lifecycle is not yet implemented.

## KPI
`_auth.html`
→ `12_KPI.gs`

Current limitation: employee read-only `getMyKpi()` only.

## Inventory
`_auth.html`
→ `13_Kho_hàng.gs`

Current limitation: backend is a documented stub and does not yet implement stock operations.

## Reports
`14_Báo_cáo.gs`
→ `10_Chấm_công.gs` attendance reporting functions

## Shared backend foundation
Most backend modules depend on:
- `01_Cấu_hình_hệ_thống.gs`
- `02_Nền_tảng_hệ_thống.gs`

## GitHub Pages experiment — NON-PRODUCTION
`web/index.html`
→ `web/api.js`
→ legacy bridge files

The GitHub Pages experiment is retained for visual/reference testing only. It is not the production transport.

## Migration rule
GitHub `main` is the source of truth. Apps Script is the production runtime. Do not remove `frontend/` or the Apps Script loader until the full production smoke-test suite is complete.
