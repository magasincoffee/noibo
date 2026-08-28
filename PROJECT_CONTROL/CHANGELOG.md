# CHANGELOG

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
- Added `PROJECT_CONTROL/appsscript.json` as the canonical Apps Script manifest.
- Updated `backend/20_Đồng_bộ_GitHub.gs` to normalize Apps Script API file names correctly and rebuild the target project from GitHub `main` only.
- Added `previewDongBoGitHubSyncPlan()` to show additions, replacements and removals before a clean sync.
- Clean sync creates an Apps Script Version backup before `projects.updateContent`.
- Clean sync removes legacy/non-canonical Apps Script files instead of preserving them, preventing duplicate global declarations such as `USER_HEADERS`.
- Deployment remains a separate controlled step.

## 2026-08-27 — PHASE 2 AUTH / SESSION / ROLE
- Re-read the canonical project from `magasincoffee/noibo` → `main`.
- Confirmed GitHub-loaded Apps Script runtime and user-validated schedule write path.
- Upgraded `backend/05_Phiên_đăng_nhập.gs` so live sessions rehydrate current user status, role and access scope from the `Người dùng` Sheet.
- Upgraded `backend/07_Phân_quyền.gs` with canonical page permissions and capability keys for all four roles.
- Added `backend/19_Phase2_Auth_Session_Role_Test.gs` for non-destructive verification in Apps Script.
- Updated the dependency map and project status to reflect the production runtime path.
- Marked GitHub Pages bridge files as experimental/non-production.

## 2026-08-27 — INITIAL REPOSITORY NORMALIZATION
- Initialized canonical repository structure for `magasincoffee/noibo`.
- Added PROJECT_CONTROL manifest, project map and dependency map.
- Moved active backend/frontend source into canonical directories by file role.
- Kept exported/version-suffixed source names out of the canonical source paths.
- Added README and documentation folders.

## Working rule
Use GitHub `main` as source of truth. Use feature branches for larger changes and review before merging. Do not reintroduce Apps Script as a backend for new Workforce work.
