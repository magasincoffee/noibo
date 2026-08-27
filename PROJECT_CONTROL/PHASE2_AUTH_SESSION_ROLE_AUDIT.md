# MAGASIN — PHASE 2 AUTH / SESSION / ROLE AUDIT

Date: 2026-08-27
Repository: `magasincoffee/noibo`
Branch: `main`

## Scope audited
- `frontend/Index.html`
- `frontend/_auth.html`
- `backend/01_Cấu_hình_hệ_thống.gs`
- `backend/02_Nền_tảng_hệ_thống.gs`
- `backend/03_Đăng_nhập_xác_thực.gs`
- `backend/04_Khôi_phục_mật_khẩu.gs`
- `backend/05_Phiên_đăng_nhập.gs`
- `backend/06_Hồ_sơ_nhân_viên.gs`
- `backend/07_Phân_quyền.gs`
- `backend/08_Quản_lý_người_dùng.gs`
- `backend/09_Lịch_làm_việc.gs`
- `backend/10_Chấm_công.gs`
- `backend/18_GitHub_Frontend_Loader.gs`

## Findings before Phase 2 changes
1. Session cache contained a snapshot of the user and did not re-read current role/status/scope from the User Sheet on protected calls.
2. Permission `pages` did not fully represent the routes and tasks exposed by the current frontend.
3. Frontend role navigation remains hardcoded in `_auth.html`; backend security is therefore the authoritative enforcement layer.
4. User-management role/status changes did not require a separate session invalidation mechanism because the Phase 2 session guard now rehydrates status/role/scope on each protected call.

## Changes now committed to GitHub main
### `backend/05_Phiên_đăng_nhập.gs`
- Added session rehydration from the canonical `Người dùng` Sheet.
- Active status is required for a session to remain valid.
- Current role and access scope replace cached values.
- `getSession()` and `requireSessionUser_()` both use the refreshed identity.

### `backend/07_Phân_quyền.gs`
- Expanded canonical page permissions for all four roles.
- Added canonical capability keys.
- Added `hasRoleCapability_()` and `requireCapability_()` for future backend module enforcement.
- `getMyAccess()` now returns `pages` and `capabilities`.

### `backend/19_Phase2_Auth_Session_Role_Test.gs`
- Added non-destructive test `testPhase2AuthSessionRole()`.
- Added `testCurrentUserAuthState(username)` which returns role/status/scope only, never password/hash/salt.

## User-validated tests already passed
- Wrong password is rejected.
- Correct password logs in.
- Schedule registration writes to Google Sheets.
- GitHub-loaded Apps Script runtime renders the canonical frontend successfully.

## Required deployment tests
These require copying the updated backend modules into the Apps Script project and deploying a new version.

1. `testPhase2AuthSessionRole()` returns `ok: true` and the four role matrices.
2. STAFF login → reload → session remains valid while active.
3. STAFF logout → session is rejected after logout.
4. STORE_MANAGER / OWNER login → only permitted management routes are visible and accessible.
5. INVENTORY_MANAGER login → inventory/report scope is respected.
6. Change a user's role/status in `Người dùng` while that user still has an existing session; the next protected request must use the new role/status.
7. Change access scope; the next store-specific protected request must use the new scope.

## Not yet completed in Phase 2
- Frontend Drawer still contains hardcoded role menu construction.
- Legacy static sidebar markup remains in `Index.html`.
- `_styles.html` still contains layered CSS from earlier versions.

These are scheduled for the next UI consolidation phase after server-side auth/session/role tests pass.

## Phase 2 conclusion
Source-level hardening is complete on GitHub `main`. Deployment-level validation remains pending until the updated 05/07/19 files are installed in the live Apps Script project and a new Web App version is deployed.
