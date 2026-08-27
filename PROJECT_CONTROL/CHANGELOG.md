# CHANGELOG

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
Use GitHub `main` as source of truth. Use feature branches for larger changes and review before merging. Do not remove the Apps Script fallback until production smoke tests are complete.
