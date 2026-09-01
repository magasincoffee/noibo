# CHANGELOG

## 2026-08-30 — EMPLOYEE PROTOTYPE V40 FROZEN
- Frozen Employee UI at **v40** as the current approved visual checkpoint.
- Added browser-accessible prototype: `PROJECT_CONTROL/prototypes/employee/magasin_noibo_employee_v40.html`.
- v40 keeps the approved Employee information architecture and business logic unchanged.
- Settings now keep `Đổi mật khẩu` collapsed by default and integrate `Thông báo` as a matching collapsed section; notification delivery remains accessible from the Header bell.
- Visual refinement direction remains: Inter typography, 8px spacing scale, restrained elevation, consistent radius/border system, clean SaaS + Soft UI + Enterprise treatment.
- Dashboard and schedule rules remain unchanged, including equal two-column tiers, full-width weekly registration module, KPI summaries, attendance reporting, and official/registration shift colors.
- **NEXT TASK: THỰC HIỆN PHẦN GIAO DIỆN CỦA MANAGER.**
- Production backend implementation remains deferred until Manager and Owner UI are finalized.

## 2026-08-30 — EMPLOYEE PROTOTYPE V38 FROZEN + NEXT MANAGER UI
- Frozen the current Employee prototype UI checkpoint at v38 for the current design cycle.
- Employee Dashboard layout finalized as: `Hôm nay` | `Công việc hôm nay`; `KPI tháng này` | `Academy`; `Đăng ký lịch làm tuần tới` full-width.
- Removed duplicate `Thông báo` navigation from the Employee sidebar; notification access remains in the Header bell.
- Settings `Đổi mật khẩu` is collapsed by default and expands on demand.
- Attendance report includes date-range filtering and summary of total shifts, hours and pay.
- Employee KPI is summarized on Dashboard and detailed KPI pages expose unmet targets, missing work, violations/incidents and Academy gaps.
- Store KPI detail compares actual values with explicit targets.
- Official schedule and schedule-registration previews use the agreed shift color convention: yellow for morning family (`06:00–14:00`), red for midday/afternoon family (`12:00–17:00`), cyan for afternoon/evening family (`14:00–22:00`).
- Weekly schedule registration was separated into its own card while preserving the expandable registration form.
- **NEXT TASK: THỰC HIỆN PHẦN GIAO DIỆN CỦA MANAGER.**
- This checkpoint is prototype/UI work only; it does not replace or mutate the canonical production `web/` Workforce implementation.

## 2026-08-28 — WORKFORCE V2 PHASE 7 MANAGER / OWNER UI
- Added `web/manager-workforce-ui.js` for manager/OWNER Workforce operations.
- Added weekly staffing-demand view with store/week navigation.
- Added staffing requirement create/update through `upsert_workforce_staffing_requirement`.
- Added generation discovery through `list_schedule_generations`.
- Added DRAFT generation creation through `create_schedule_generation`.
- Added draft assignment review table through `get_schedule_generation_assignments`.
- Added manager/OWNER Workforce navigation entry without replacing the existing HR/approval module.
- Kept REVIEWED/PUBLISHED transitions and official `work_schedules` mutation out of Phase 7.

## 2026-08-28 — WORKFORCE V2 PHASE 6 EMPLOYEE UI
- Added `web/workforce-ui.js` as the employee-facing Workforce V2 schedule surface.
- Replaced the employee schedule view through a narrow additive UI layer without rewriting the existing application shell.
- Employee can view approved official schedules week-by-week.
- Employee can navigate previous/current/next scheduling weeks.
- Employee can view date-specific availability windows from Supabase.
- Employee can add multiple availability windows per day.
- Employee can select `AVAILABLE`, `PREFERRED` or `UNAVAILABLE` for each window.
- Employee can choose a preferred store or no preferred store.
- Employee can delete their own availability through controlled RPCs.
- Updated `web/supabase-config.js` to load the Workforce UI layer after the application shell initializes.
- Kept manager/OWNER generation/review/publish flows and official `work_schedules` mutation out of Phase 6.

## 2026-08-28 — WORKFORCE V2 PHASE 5 SUPABASE RPC/API
- Added controlled Supabase RPCs for employee availability self-service.
- Added controlled Workforce staffing-demand read/write APIs with server-side store scope and data validation.
- Added scheduler generation creation/read/cancel APIs for DRAFT generations.
- Added atomic replacement of generation assignments with structural checks for generation week, store scope, active employees and employee overlap.
- Added deterministic generation assignment read API with employee/store display metadata.
- Explicitly kept REVIEWED/PUBLISHED transitions out of Phase 5 until final validation/revalidation and publish transaction are implemented.
- Explicitly kept official `work_schedules` untouched by Phase 5 RPCs.
- Revoked RPC execution from `anon`/`public`; authenticated callers are checked server-side.
- Added `docs/architecture/MAGASIN_WORKFORCE_RPC_API_V1.md` as the frontend/API contract.

## 2026-08-28 — WORKFORCE V2 PHASE 0-4 CLEAN CHECKPOINTS
- Rebuilt Phase 0-4 branches from a clean `main` lineage after closing earlier noisy draft PRs.
- Kept scheduler engine and validation package separated from Supabase mutation/publish paths.

## 2026-08-27 — CLEAN GITHUB → APPS SCRIPT SYNC V2
- Replaced the previous merge-style synchronization model with an exact canonical project replacement model.
- Added PROJECT_CONTROL/appsscript.json as the canonical Apps Script manifest.
- Updated backend/20_Đồng_bộ_GitHub.gs to normalize Apps Script API file names correctly and rebuild the target project from GitHub main only.
- Added previewDongBoGitHubSyncPlan() to show additions, replacements and removals before a clean sync.
- Clean sync creates an Apps Script Version backup before projects.updateContent.
- Clean sync removes legacy/non-canonical Apps Script files instead of preserving them, preventing duplicate global declarations such as USER_HEADERS.
- Deployment remains a separate controlled step.

## 2026-08-27 — PHASE 2 AUTH / SESSION / ROLE
- Re-read the canonical project from magasincoffee/noibo → main.
- Confirmed GitHub-loaded Apps Script runtime and user-validated schedule write path.
- Upgraded backend/05_Phiên_đăng_nhập.gs so live sessions rehydrate current user status, role and access scope from the Người dùng Sheet.
- Upgraded backend/07_Phân_quyền.gs with canonical page permissions and capability keys for all four roles.
- Added backend/19_Phase2_Auth_Session_Role_Test.gs for non-destructive verification in Apps Script.
- Updated the dependency map and project status to reflect the production runtime path.
- Marked GitHub Pages bridge files as experimental/non-production.

## 2026-08-27 — INITIAL REPOSITORY NORMALIZATION
- Initialized canonical repository structure for magasincoffee/noibo.
- Added PROJECT_CONTROL manifest, project map and dependency map.
- Moved active backend/frontend source into canonical directories by file role.
- Kept exported/version-suffixed source names out of the canonical source paths.
- Added README and documentation folders.

## Working rule
Use GitHub `main` as source of truth. Use feature branches for larger changes and review before merging. Do not reintroduce Apps Script as a backend for new Workforce work.
