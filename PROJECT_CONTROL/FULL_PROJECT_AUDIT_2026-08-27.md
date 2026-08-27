# MAGASIN — FULL PROJECT AUDIT

Date: 2026-08-27
Repository: magasincoffee/noibo
Branch audited: main
Audit scope: repository structure, project-control documents, backend 01–15, frontend Index/_styles/_auth/_schedule/_attendance/_management, and cross-module consistency based on the current canonical source.

## 1. Repository baseline

Status: PASS

- `main` contains the canonical top-level directories: `PROJECT_CONTROL/`, `backend/`, `frontend/`, `docs/`, and `README.md`.
- `PROJECT_CONTROL/MAGASIN_PROJECT_MANIFEST.md` explicitly defines the canonical source-of-truth rule.
- `PROJECT_CONTROL/MAGASIN_PROJECT_MAP.md` defines the current Google Apps Script + Google Sheets architecture.
- `PROJECT_CONTROL/MAGASIN_DEPENDENCY_MAP.md` defines the main frontend/backend dependencies.
- The prior normalization PR has been merged into `main`.

## 2. Canonical backend inventory

Status: COMPLETE

All 15 canonical backend modules exist under `backend/` and use the expected filenames 01–15.

01 Configuration — present
02 Foundation — present
03 Authentication — present
04 Password recovery — present
05 Session — present
06 Employee profile — present
07 Permissions — present
08 User management — present
09 Schedule — present
10 Attendance — present
11 Shift swap — present
12 KPI — present
13 Inventory — present (stub / not implemented)
14 Reports — present (wrapper)
15 Web app — present

## 3. Canonical frontend inventory

Status: COMPLETE

All 6 canonical frontend files exist under `frontend/`:

- `Index.html`
- `_styles.html`
- `_auth.html`
- `_schedule.html`
- `_attendance.html`
- `_management.html`

## 4. Runtime architecture audit

Status: PASS WITH TECHNICAL FOLLOW-UP

Current intended runtime:

Google Apps Script HTML Service
→ `Index.html`
→ raw partials via `include()`
→ `google.script.run`
→ Google Apps Script backend
→ single operational Spreadsheet

`backend/15_Ứng_dụng_web.gs` now uses `createTemplateFromFile(name).getRawContent()` for partials. This matches the current raw-partial architecture and avoids parsing JavaScript partials as standalone HTML.

`backend/02_Nền_tảng_hệ_thống.gs` centralizes the canonical Spreadsheet ID and common helpers.

## 5. Cross-module findings

### FINDING A — LEGACY BRANDING / PREFIXES
Severity: LOW–MEDIUM

Several backend comments and constants still use legacy `BREWFLOW` naming, including session/password-reset prefixes and some email subjects/messages.

Examples observed:
- `SESSION_PREFIX = 'BREWFLOW_SESSION_'`
- `PASSWORD_RESET_PREFIX = 'BREWFLOW_PASSWORD_RESET_'`
- registration / password recovery email text still contains `BrewFlow` in places.

Impact:
- Does not necessarily break runtime because all modules use the same constants/helpers.
- Creates project inconsistency and can confuse future maintenance.

Recommended action:
- Normalize branding to `MAGASIN` in a controlled migration.
- Do not rename persisted keys casually without a compatibility/migration plan.

### FINDING B — PERMISSION LIST IS NOT FULLY ALIGNED WITH CURRENT UI ROUTES
Severity: MEDIUM

`backend/07_Phân_quyền.gs` returns page permissions that currently cover dashboard/inventory/orders/reports/settings for management roles and dashboard/inventory for staff, while the current frontend architecture includes dedicated employee tasks such as schedule and attendance plus a management schedule route.

The actual UI navigation in `_auth.html` contains role-based schedule/attendance routes beyond the `pages` list returned by `getMyAccess()`.

Impact:
- Client navigation and backend permission metadata are not a single source of truth.
- Future permission-sensitive features may rely on hardcoded client logic instead of one canonical permission map.

Recommended action:
- Define canonical capability keys for schedule, attendance, shift swap, schedule management, inventory and reports.
- Make frontend rendering consume the same permission/capability response.

### FINDING C — INVENTORY BACKEND IS NOT IMPLEMENTED
Severity: HIGH FOR FUNCTIONAL COMPLETENESS

`backend/13_Kho_hàng.gs` is explicitly a stub and returns `implemented:false`.

Impact:
- UI/navigation may expose inventory-related functions while the backend does not yet implement stock operations.

Status:
- Correctly documented as not implemented.
- Must not be treated as production-complete.

### FINDING D — KPI BACKEND IS READ-ONLY FOR THE EMPLOYEE
Severity: MEDIUM FOR FUNCTIONAL COMPLETENESS

`backend/12_KPI.gs` currently exposes `getMyKpi()` only.

Impact:
- Employee KPI display is supported.
- KPI setup/evaluation/management workflow is not implemented in this module.

### FINDING E — SHIFT SWAP IS ONLY EMPLOYEE SUBMISSION/READ
Severity: MEDIUM FOR FUNCTIONAL COMPLETENESS

`backend/11_Đổi_ca.gs` currently provides employee submission and retrieval of own shift-swap requests. No manager approval workflow is present in this module.

Impact:
- Shift swap lifecycle is incomplete unless another module handles the missing management actions.

### FINDING F — REPORT MODULE IS A WRAPPER
Severity: LOW

`backend/14_Báo_cáo.gs` delegates to attendance-management logic in module 10.

This is architecturally acceptable if intentional, but the Project Map should describe module 14 as a reporting façade rather than an independent reporting engine.

### FINDING G — SCHEDULE AND ATTENDANCE ARE TIGHTLY COUPLED
Severity: MEDIUM / EXPECTED

`backend/10_Chấm_công.gs` reads approved schedule rows from `Lịch làm việc` to determine planned shifts. This dependency is intentional and documented, but schedule schema changes must be tested against attendance immediately.

### FINDING H — FRONTEND `Index.html` STILL CONTAINS LEGACY STATIC SIDEBAR MARKUP
Severity: MEDIUM

`frontend/Index.html` currently contains a static sidebar shell with legacy `staff-only-menu` / `manager-only-menu` elements, while `_auth.html` also builds role-based Drawer navigation dynamically.

Impact:
- There are two navigation representations in the frontend.
- This contributed to earlier sidebar/header synchronization issues.

Recommended action:
- Consolidate navigation ownership in `_auth.html` and reduce `Index.html` to the shell/header/container required by ARCH-01.

### FINDING I — `_styles.html` IS LARGE AND LAYERED
Severity: MEDIUM

The current `_styles.html` contains the base login/app shell plus multiple generations of responsive and module-specific CSS. The current header/Drawer rules are later overrides.

Impact:
- It is functional but remains harder to maintain than a clean single-source design system.
- Future CSS changes risk regression if selectors from older layers remain active.

Recommended action:
- After functional stabilization, perform a controlled CSS consolidation with visual regression tests on desktop/tablet/mobile.

## 6. Authentication/security audit

Status: PASS WITH FOLLOW-UP

Positive findings:
- Passwords are hashed with per-user salts.
- Login attempts are rate-limited using script cache.
- Session token is stored client-side in `sessionStorage` with legacy migration cleanup from `localStorage`.
- Password reset token is stored server-side in cache rather than client storage.
- Role/scope checks exist on management backend functions.
- Canonical manifest explicitly prohibits committing secrets and production personal data.

Follow-up:
- Review branding/legacy prefixes.
- Review token/session lifecycle and deployment configuration during production hardening.

## 7. Data layer audit

Status: PASS WITH FOLLOW-UP

- One canonical Spreadsheet ID is defined in module 02.
- `OPERATIONAL_SHEET_DEFS` defines the operational sheets centrally.
- Schedule schema preserves the legacy `Ca` column for compatibility.
- Attendance schema has planned start/end fields and consumes approved schedule information.

Follow-up:
- Create and maintain a formal schema document in `docs/database/`.
- Define data ownership for each column and migration rules before further schema changes.

## 8. Frontend/backend compatibility audit

Status: PARTIAL — NEEDS SYSTEM TEST

The canonical file names and primary function names are aligned sufficiently to continue development, and the current schedule frontend calls `registerShift`, schedule-loading functions and time-option builders that match the current backend direction.

However, a source-code audit alone cannot prove the deployed Apps Script version matches GitHub `main`. Deployment parity must be verified before treating `main` as production source.

## 9. Current functional maturity

READY / STABLE FOUNDATION:
- Project structure
- Authentication
- Session handling
- Role normalization
- Access scope foundation
- Employee profile
- Current-week schedule UI foundation
- Next-week schedule registration foundation
- Attendance foundation
- Header + Drawer foundation

PARTIALLY IMPLEMENTED:
- Management schedule workflow
- Shift swap
- KPI
- Reports
- Inventory

NOT YET PROVEN IN PRODUCTION FROM THIS AUDIT:
- End-to-end deployed parity between GitHub `main` and Apps Script project
- Full desktop/mobile regression suite
- Full employee → manager → attendance integration test
- Concurrency and edge-case testing across all modules

## 10. Recommended next phase

Do not add more UI patches before establishing deployment parity.

Phase 1 — Freeze the baseline
1. Treat GitHub `main` as canonical source.
2. Compare the Apps Script project against every canonical file in GitHub.
3. Confirm deployed version and source version are identical.

Phase 2 — Functional smoke test
1. Login/register/reset.
2. Drawer/header.
3. Employee schedule.
4. Next-week registration.
5. Manager approval/direct assignment.
6. Attendance consuming approved schedule.
7. Employee profile.

Phase 3 — Architecture cleanup
1. Consolidate permission capabilities.
2. Remove legacy static navigation duplication.
3. Consolidate `_styles.html` after functional stabilization.
4. Normalize legacy BrewFlow branding with migration-safe changes.

Phase 4 — Build remaining business modules
1. Inventory.
2. Shift swap management.
3. KPI management.
4. Reports expansion.

## 11. Audit conclusion

Overall status: YELLOW — GOOD FOUNDATION, NOT PRODUCTION-COMPLETE.

The repository is now correctly organized and has a usable source-of-truth structure. The most important remaining work is not another visual patch; it is deployment parity, permission centralization, and completion of the partially implemented business modules.

For future chats, use:
`LOAD MAGASIN NOIBO CURRENT`

The canonical source must be read from:
`magasincoffee/noibo` → `main`
