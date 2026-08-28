# CHANGELOG

## 2026-08-28 — WORKFORCE V2 PHASE 0 ARCHITECTURE
- Added `docs/architecture/MAGASIN_WORKFORCE_ARCHITECTURE_V2.md` as the canonical schedule/workforce contract.
- Fixed V1 business timezone to `Asia/Ho_Chi_Minh` and scheduling week to Monday-Sunday.
- Defined multiple date-specific availability windows per employee/day.
- Defined precedence: `UNAVAILABLE` overrides overlapping `AVAILABLE`/`PREFERRED`; `PREFERRED` remains workable but scores as a preference.
- Explicitly kept overnight shifts out of V1 because the existing time-range model requires `end_time > start_time`.
- Defined hard constraints for availability, overlap, hours, rest, skills, store eligibility, mentor coverage and maximum staffing.
- Defined deterministic scheduler objectives and stable tie-breaking; no random scheduler behavior.
- Defined requirement coverage semantics over time intervals.
- Defined generation lifecycle as `DRAFT → REVIEWED → PUBLISHED` with transactional revalidation at publish.
- Defined official schedule as `work_schedules` and the generation layer as a separate draft/review layer.
- Defined attendance linkage and shift-swap interaction boundaries.
- Updated `PROJECT_CONTROL/STATUS.md` to record Phase 0 as documentation-only and identify the remaining implementation phases.
- Rewrote `PROJECT_CONTROL/MAGASIN_DEPENDENCY_MAP.md` to remove obsolete Apps Script production-path instructions and align it with the Supabase-only runtime.

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
