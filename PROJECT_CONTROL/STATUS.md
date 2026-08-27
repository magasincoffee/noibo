# MAGASIN PROJECT STATUS

## Repository
`magasincoffee/noibo`

## Canonical branch
`main`

## Source of truth
GitHub `main` is the canonical source for backend and frontend code.

## Production runtime
Google Apps Script HTML Service + Google Apps Script backend + Google Sheets.

## Current runtime path
`/exec?source=github`
→ `18_GitHub_Frontend_Loader.gs`
→ `main/frontend/*`
→ HtmlService
→ `google.script.run`
→ MAGASIN backend
→ Google Sheets

## Completed and user-validated
- Repository structure normalized and merged to `main`.
- GitHub frontend source loading from Apps Script works.
- Login wrong-password rejection: PASS.
- Login correct-password success: PASS.
- Schedule registration writes to Google Sheets: PASS.
- Google Cloud project `MAGASIN NOIBO` configured and linked for Apps Script API access.
- `testDongBoGitHub()`: PASS.
- `previewDongBoGitHub()`: PASS; canonical source count reported as 27 runtime files.
- Previous merge-style sync: PASS at API level, but exposed legacy duplicate globals in Apps Script. This path is now retired.

## PHASE 2 — AUTH / SESSION / ROLE
### Code changes completed in GitHub
- `backend/05_Phiên_đăng_nhập.gs` upgraded to refresh session identity/status/role/accessScope from the current `Người dùng` Sheet.
- `backend/07_Phân_quyền.gs` upgraded with canonical page permissions and capability keys for STAFF, INVENTORY_MANAGER, STORE_MANAGER and OWNER.
- `backend/19_Phase2_Auth_Session_Role_Test.gs` added for safe Apps Script editor verification.
- `frontend/_phase2_ui_fix.html` added for session-restore, logout and saved-page UX fixes.

### User validation status
- Login success/failure: PASS.
- Schedule write through GitHub-loaded frontend: PASS.
- Logout and reload/page-restoration after the latest UI fix: PENDING final smoke test.
- Manager/owner role visibility and live role/status-change test: PENDING final smoke test.

## SOURCE SYNCHRONIZATION — CLEAN V2
### Canonical sync module
`backend/20_Đồng_bộ_GitHub.gs`

### Canonical Apps Script manifest
`PROJECT_CONTROL/appsscript.json`

### Current workflow
1. `testDongBoGitHub()` — verifies Apps Script API access.
2. `previewDongBoGitHub()` — builds and validates the exact canonical target without changing Apps Script.
3. `previewDongBoGitHubSyncPlan()` — compares current Apps Script files against the exact GitHub target and lists additions/replacements/removals.
4. `dongBoGitHubSangAppsScript()` — creates a backup Version, then replaces Apps Script HEAD with the exact canonical manifest + runtime file set.

### Clean-sync rule
The sync engine no longer merges or preserves unknown legacy Apps Script files. Every clean sync sends only the GitHub canonical manifest plus the 27 canonical backend/frontend files. This removes legacy duplicate files that can cause global `const`/`let` redeclaration errors.

### Apps Script API naming rule
The sync engine converts GitHub filenames to Apps Script API file names correctly:
- `.gs` → `SERVER_JS` name without `.gs`
- `.html` → `HTML` name without `.html`
- `PROJECT_CONTROL/appsscript.json` → `JSON` file named `appsscript`

### Important operating rule
Manual copy-paste is no longer required for canonical backend/frontend files after GitHub changes. Run the sync function to update Apps Script from `main`. Deployment remains a separate controlled step until the production smoke-test suite is fully validated.

## Next phase after Phase 2
- Header + Drawer role-driven UI consolidation.
- Remove legacy static sidebar duplication from `frontend/Index.html`.
- Verify current-week official schedule vs next-week registration/approval.
- Verify approved schedule → attendance integration on desktop/mobile.

## Known incomplete business modules
- Inventory: backend stub only.
- Shift swap: employee submit/read only.
- KPI: employee read only.
- Reports: façade over attendance reporting.

## Working rule
Use GitHub `main` as source of truth. Use feature branches for larger changes. Do not retire the current Apps Script deployment until the full production smoke-test suite passes.
